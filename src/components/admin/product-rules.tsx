"use client";

import { useMemo } from "react";
import type { Attribute, PropertyDependencies, ProductRules, RuleMatch, Rule } from "@/lib/types";
import { allCombinations, comboKey } from "@/lib/options";
import { PhotoPicker } from "./photo-picker";


export function ProductRulesEditor({
  attributes,
  dependencies,
  rules,
  onChange,
}: {
  attributes: Attribute[];
  dependencies: PropertyDependencies;
  rules: ProductRules;
  onChange: (rules: ProductRules) => void;
}) {
  
  function getRelevantAttributes(propKey: keyof PropertyDependencies) {
    const deps = dependencies[propKey] || [];
    return attributes.filter(a => deps.includes(a.name));
  }

  function renderTable<T>(
    propKey: keyof ProductRules, 
    label: string, 
    renderInput: (combo: Record<string, string>, currentVal: T | undefined, update: (v: T) => void) => React.ReactNode
  ) {
    const relevantAttrs = getRelevantAttributes(propKey);
    if (relevantAttrs.length === 0) {
      return (
        <div className="text-sm text-muted-foreground p-4 border border-dashed rounded">
          No attributes affect {label}. It applies globally.
        </div>
      );
    }

    const combos = allCombinations(relevantAttrs);
    const ruleSet = rules[propKey] || [];

    return (
      <div className="mt-2 border rounded overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted">
            <tr>
              {relevantAttrs.map(a => <th key={a.name} className="px-4 py-2">{a.name}</th>)}
              <th className="px-4 py-2 w-1/2">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {combos.map(combo => {
              const key = comboKey(combo);
              const existingRule = ruleSet.find((r: any) => comboKey(r.match) === key);
              
              const update = (newVal: T) => {
                 let nextRules = [...ruleSet];
                 const idx = nextRules.findIndex((r: any) => comboKey(r.match) === key);
                 if (idx >= 0) {
                   nextRules[idx] = { match: combo, value: newVal } as any;
                 } else {
                   nextRules.push({ match: combo, value: newVal } as any);
                 }
                 onChange({ ...rules, [propKey]: nextRules });
              };

              return (
                <tr key={key}>
                  {relevantAttrs.map(a => <td key={a.name} className="px-4 py-2">{combo[a.name]}</td>)}
                  <td className="px-4 py-2">
                    {renderInput(combo, existingRule?.value as T, update)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium mb-1">Price Rules</h3>
        <p className="text-sm text-muted-foreground mb-4">Set specific prices for these combinations.</p>
        {renderTable<number>("price", "Price", (combo, val, update) => (
          <input type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
             value={val === undefined ? "" : val} 
             onChange={e => update(Number(e.target.value) || 0)} 
             placeholder="Price"
          />
        ))}
      </div>

      <div>
        <h3 className="text-lg font-medium mb-1">Image Rules</h3>
        <p className="text-sm text-muted-foreground mb-4">Assign images to these combinations.</p>
        {renderTable<string[]>("images", "Images", (combo, val, update) => (
          <PhotoPicker
             selected={val || []}
             onChange={update}
          />
        ))}
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-1">Stock Rules</h3>
        <p className="text-sm text-muted-foreground mb-4">Set stock limits for these combinations.</p>
        {renderTable<number>("stock", "Stock", (combo, val, update) => (
          <input type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
             value={val === undefined ? "" : val} 
             onChange={e => update(Number(e.target.value) || 0)} 
             placeholder="Stock"
          />
        ))}
      </div>
    </div>
  );
}
