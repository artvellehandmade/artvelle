"use client";

import type { Attribute, PropertyDependencies } from "@/lib/types";

export function ProductPropertyModules({
  attributes,
  dependencies,
  onChange
}: {
  attributes: Attribute[];
  dependencies: PropertyDependencies;
  onChange: (deps: PropertyDependencies) => void;
}) {
  const properties = [
    { key: "price" as const, label: "Price" },
    { key: "images" as const, label: "Images" },
    { key: "stock" as const, label: "Stock" },
    { key: "weight" as const, label: "Weight" },
  ];

  function toggleDependency(propKey: keyof PropertyDependencies, attrName: string) {
    const current = dependencies[propKey] || [];
    const newDeps = current.includes(attrName)
      ? current.filter(n => n !== attrName)
      : [...current, attrName];
    
    onChange({ ...dependencies, [propKey]: newDeps });
  }

  if (attributes.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Property Modules</h3>
      <p className="text-sm text-muted-foreground">
        Select which attributes affect which properties. For example, if Price depends on Design and Size, check both boxes under Price.
      </p>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2">Property</th>
              {attributes.map(attr => (
                <th key={attr.name} className="px-4 py-2">{attr.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {properties.map(prop => (
              <tr key={prop.key}>
                <td className="px-4 py-3 font-medium">{prop.label}</td>
                {attributes.map(attr => (
                  <td key={attr.name} className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={(dependencies[prop.key] || []).includes(attr.name)}
                      onChange={() => toggleDependency(prop.key, attr.name)}
                      className="w-4 h-4 text-primary rounded border-input"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
