import { PrismaClient } from "@prisma/client";
import { allCombinations, comboKey } from "../src/lib/options";

const db = new PrismaClient();

async function main() {
  const products = await db.product.findMany();
  let migrated = 0;

  for (const product of products) {
    if ((product.attributes as any)?.length > 0) {
      console.log("Skipping " + product.name + " (already migrated)");
      continue;
    }

    const options = (product.options as any[]) || [];
    const variants = (product.variants as any[]) || [];
    const variantPrices = (product.variantPrices as any[]) || [];
    
    // 1. Generate attributes
    const attributes = options.map(opt => ({
      name: opt.name,
      values: opt.choices.map((c: any) => c.label)
    }));

    // 2. Generate propertyModules (everything depends on everything for a safe migration)
    const attributeNames = attributes.map(a => a.name);
    const propertyModules = {
      price: attributeNames,
      images: attributeNames,
      stock: attributeNames,
      weight: attributeNames
    };

    // 3. Generate rules based on old variations
    const rules = {
      price: [] as any[],
      images: [] as any[],
      stock: [] as any[],
      weight: [] as any[]
    };

    // If they used variants (Flipkart-style matrix)
    if (variants.length > 0) {
      for (const v of variants) {
        rules.price.push({ match: v.combo, value: v.price });
        if (v.images?.length > 0) {
           rules.images.push({ match: v.combo, value: v.images });
        }
        rules.stock.push({ match: v.combo, value: v.available ? 99 : 0 });
      }
    } 
    // If they used simple options (Price Deltas)
    else {
       const combos = allCombinations(attributes);
       for (const combo of combos) {
          let price = product.price;
          let stock = product.stock;
          let images: string[] = [];
          let available = true;

          // Check if there is a variantPrice override
          const vpMatch = variantPrices.find(vp => comboKey(vp.combo) === comboKey(combo));
          if (vpMatch) {
             price = vpMatch.price;
          } else {
             // Calculate from deltas
             for (const opt of options) {
               const choice = opt.choices.find((c: any) => c.label === combo[opt.name]);
               if (choice) {
                 if (choice.priceDelta) price += choice.priceDelta;
                 if (choice.images?.length > 0) images.push(...choice.images);
                 if (choice.available === false) available = false;
               }
             }
          }

          rules.price.push({ match: combo, value: price });
          if (images.length > 0) {
            rules.images.push({ match: combo, value: images });
          }
          if (!available) {
            rules.stock.push({ match: combo, value: 0 });
          }
       }
    }

    // 4. Generate sellableVariants Cache
    const combos = allCombinations(attributes);
    const sellableVariants = combos.map(combo => {
      const priceRule = rules.price.find((r: any) => comboKey(r.match) === comboKey(combo));
      const imagesRule = rules.images.find((r: any) => comboKey(r.match) === comboKey(combo));
      const stockRule = rules.stock.find((r: any) => comboKey(r.match) === comboKey(combo));
      
      return {
        id: comboKey(combo) || 'default',
        combo,
        price: priceRule?.value ?? product.price,
        images: imagesRule?.value ?? [],
        stock: stockRule?.value ?? product.stock,
        weight: product.weightGrams ?? 0,
        available: stockRule?.value ? stockRule.value > 0 : product.stock > 0
      };
    });

    await db.product.update({
      where: { id: product.id },
      data: {
        attributes,
        propertyModules,
        rules,
        sellableVariants
      }
    });

    migrated++;
    console.log("Migrated " + product.name);
  }

  console.log("Done! Migrated " + migrated + " products to Rule-Based Engine.");
}

main().catch(console.error).finally(() => db.$disconnect());
