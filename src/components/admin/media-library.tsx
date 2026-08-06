"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Check,
  RefreshCw,
  Search,
  Upload,
  X,
  Filter,
  Image as ImageIcon,
  Tag as TagIcon,
  HardDrive,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";


type Photo = {
  id: string;
  url: string;
  file: string;
  category: string;
  group: string;
  source: "repo" | "blob" | "external";
  tags: string[];
  roles: string[];
  size?: number;
  width?: number;
  height?: number;
  createdAt: string;
  variantAttribute?: string | null;
  variantValue?: string | null;
  subcategoryName?: string | null;
};

type PhotoUse = { kind: string; id: string; name: string; slot?: string };
type Library = { photos: Photo[]; usage: Record<string, PhotoUse[]> };

export function MediaLibrary() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  
  // Filters
  const [filterSource, setFilterSource] = useState<string>("All");
  const [filterRole, setFilterRole] = useState<string>("All");
  const [filterTag, setFilterTag] = useState<string>("All");
  const [filterUsage, setFilterUsage] = useState<string>("All");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load photos");
      setLibrary(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const activePhoto = useMemo(() => {
    if (!activePhotoId || !library) return null;
    return library.photos.find(p => p.id === activePhotoId) || null;
  }, [activePhotoId, library]);

  const allTags = useMemo(() => {
    if (!library) return [];
    const tags = new Set<string>();
    library.photos.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [library]);

  const allRoles = useMemo(() => {
    if (!library) return [];
    const roles = new Set<string>();
    library.photos.forEach(p => p.roles.forEach(r => roles.add(r)));
    return Array.from(roles).sort();
  }, [library]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (library?.photos ?? []).filter((p) => {
      if (filterSource !== "All" && p.source !== filterSource) return false;
      if (filterRole !== "All" && !p.roles.includes(filterRole)) return false;
      if (filterTag !== "All" && !p.tags.includes(filterTag)) return false;
      
      const uses = library?.usage[p.url] || [];
      if (filterUsage === "Unused" && uses.length > 0) return false;
      if (filterUsage === "Used" && uses.length === 0) return false;

      if (!needle) return true;
      const searchable = `${p.file} ${p.tags.join(" ")} ${p.roles.join(" ")}`.toLowerCase();
      return searchable.includes(needle);
    });
  }, [library, q, filterSource, filterRole, filterTag, filterUsage]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const updatePhoto = async (id: string, updates: Partial<Photo>) => {
    try {
      const res = await fetch(`/api/admin/media/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error("Failed to update");
      setLibrary(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          photos: prev.photos.map(p => p.id === id ? { ...p, ...updates } : p)
        };
      });
      toast.success("Updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading && !library) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground"><RefreshCw className="animate-spin w-5 h-5 mr-2"/> Loading library...</div>;
  }

  return (
    <div className="flex h-full">
      {/* Left Filters Sidebar */}
      <div className="w-64 shrink-0 border-r border-border bg-card overflow-y-auto hidden md:block p-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Source</h3>
          <div className="space-y-1">
            {["All", "repo", "blob", "external"].map(src => (
              <button 
                key={src} 
                onClick={() => setFilterSource(src)}
                className={cn("w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors", filterSource === src ? "bg-accent/10 text-accent font-medium" : "hover:bg-muted text-muted-foreground")}
              >
                {src === "All" ? "All Sources" : src === "repo" ? "Public Folder" : src === "blob" ? "Blob Storage" : "External URLs"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Usage</h3>
          <div className="space-y-1">
            {["All", "Used", "Unused"].map(use => (
              <button 
                key={use} 
                onClick={() => setFilterUsage(use)}
                className={cn("w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors", filterUsage === use ? "bg-accent/10 text-accent font-medium" : "hover:bg-muted text-muted-foreground")}
              >
                {use}
              </button>
            ))}
          </div>
        </div>

        {allRoles.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Roles</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setFilterRole("All")}
                className={cn("w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors", filterRole === "All" ? "bg-accent/10 text-accent font-medium" : "hover:bg-muted text-muted-foreground")}
              >
                All Roles
              </button>
              {allRoles.map(role => (
                <button 
                  key={role} 
                  onClick={() => setFilterRole(role)}
                  className={cn("w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors", filterRole === role ? "bg-accent/10 text-accent font-medium" : "hover:bg-muted text-muted-foreground")}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        )}

        {allTags.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              <button 
                onClick={() => setFilterTag("All")}
                className={cn("px-2.5 py-1 text-xs rounded-full border transition-colors", filterTag === "All" ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:bg-muted")}
              >
                All
              </button>
              {allTags.map(tag => (
                <button 
                  key={tag} 
                  onClick={() => setFilterTag(tag)}
                  className={cn("px-2.5 py-1 text-xs rounded-full border transition-colors", filterTag === tag ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:bg-muted")}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
        {/* Toolbar */}
        <div className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              className="input pl-8 py-1.5 h-8 text-xs w-full"
              placeholder="Search images..."
              value={q}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchLibrary()}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
            </Button>
            <Button size="sm">
              <Upload className="w-4 h-4 mr-2" /> Upload
            </Button>
          </div>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {visible.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No media found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {visible.map(photo => {
                const uses = library?.usage[photo.url] || [];
                const isSelected = selectedIds.has(photo.id);
                const isActive = activePhotoId === photo.id;
                
                return (
                  <div 
                    key={photo.id}
                    onClick={() => setActivePhotoId(photo.id)}
                    className={cn(
                      "group relative aspect-square rounded-xl border bg-card overflow-hidden cursor-pointer transition-all hover:border-accent hover:shadow-sm",
                      isActive ? "ring-2 ring-accent border-accent" : "border-border",
                      isSelected && "ring-2 ring-primary border-primary"
                    )}
                  >
                    <Image 
                      src={photo.url} 
                      alt={photo.file} 
                      fill 
                      className="object-cover transition-transform group-hover:scale-105" 
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    
                    {/* Checkbox Overlay */}
                    <div 
                      className={cn(
                        "absolute top-2 left-2 z-10 p-1 rounded-md transition-opacity",
                        isSelected ? "opacity-100 bg-primary text-primary-foreground" : "opacity-0 group-hover:opacity-100 bg-background/80 hover:bg-background"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(photo.id);
                      }}
                    >
                      <Check className={cn("w-4 h-4", !isSelected && "opacity-30")} />
                    </div>
                    
                    {/* Info Overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 pointer-events-none">
                      <p className="text-white text-xs truncate drop-shadow-md">{photo.file.split('/').pop()}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {uses.length > 0 && (
                          <span className="text-[10px] text-white/80 bg-white/20 rounded px-1.5 py-0.5 backdrop-blur-sm">
                            {uses.length} use{uses.length !== 1 && 's'}
                          </span>
                        )}
                        {photo.roles.length > 0 && (
                          <span className="text-[10px] text-accent-foreground bg-accent/80 rounded px-1.5 py-0.5 backdrop-blur-sm truncate">
                            {photo.roles[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Info Panel */}
      {activePhoto && (
        <div className="w-80 shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col">
          <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
            <h3 className="font-medium text-sm">Image Details</h3>
            <button onClick={() => setActivePhotoId(null)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 space-y-6">
            <div className="aspect-square relative rounded-lg border border-border overflow-hidden bg-muted/30">
              <Image 
                src={activePhoto.url} 
                alt={activePhoto.file} 
                fill 
                className="object-contain" 
              />
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Filename</p>
                <p className="break-all">{activePhoto.file.split('/').pop()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Source</p>
                  <p className="capitalize flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> {activePhoto.source}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Added</p>
                  <p>{new Date(activePhoto.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground text-xs mb-2">Smart Categorization</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Category (Derived)</label>
                    <input 
                      type="text" 
                      value={activePhoto.category || ""}
                      disabled
                      className="input h-7 px-2 text-xs w-full mt-1 bg-muted/50 cursor-not-allowed" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Subcategory</label>
                    <input 
                      type="text" 
                      value={activePhoto.subcategoryName || ""}
                      onChange={(e) => updatePhoto(activePhoto.id, { subcategoryName: e.target.value || null })}
                      className="input h-7 px-2 text-xs w-full mt-1" 
                      placeholder="e.g. Resin Pooja Thali"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Variant Attr</label>
                      <input 
                        type="text" 
                        value={activePhoto.variantAttribute || ""}
                        onChange={(e) => updatePhoto(activePhoto.id, { variantAttribute: e.target.value || null })}
                        className="input h-7 px-2 text-xs w-full mt-1" 
                        placeholder="e.g. Design"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Variant Value</label>
                      <input 
                        type="text" 
                        value={activePhoto.variantValue || ""}
                        onChange={(e) => updatePhoto(activePhoto.id, { variantValue: e.target.value || null })}
                        className="input h-7 px-2 text-xs w-full mt-1" 
                        placeholder="e.g. Pink"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground text-xs mb-2">Roles (System Level)</p>
                <div className="flex flex-wrap gap-1.5">
                  {activePhoto.roles.map(r => (
                    <span key={r} className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs">{r}</span>
                  ))}
                  <button className="px-2 py-0.5 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:bg-muted">
                    + Add Role
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground text-xs mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {activePhoto.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full border border-border bg-muted/50 text-xs">{t}</span>
                  ))}
                  <button className="px-2 py-0.5 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:bg-muted">
                    + Add Tag
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground text-xs mb-2">Usage Context</p>
                {(() => {
                  const uses = library?.usage[activePhoto.url] || [];
                  if (uses.length === 0) return <p className="text-muted-foreground text-xs italic">Not used anywhere</p>;
                  return (
                    <ul className="space-y-2">
                      {uses.map((u, i) => (
                        <li key={i} className="flex flex-col gap-0.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium truncate">{u.name}</span>
                          </div>
                          <span className="text-muted-foreground pl-5 capitalize">
                            {u.kind} • {u.slot || "Gallery"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
            
            <div className="pt-4 mt-auto">
              <Button 
                variant="danger" 
                className="w-full" 
                disabled={(library?.usage[activePhoto.url] || []).length > 0}
              >
                Delete Image
              </Button>
              {(library?.usage[activePhoto.url] || []).length > 0 && (
                <p className="text-center text-[10px] text-muted-foreground mt-2">Cannot delete image while it is in use.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
