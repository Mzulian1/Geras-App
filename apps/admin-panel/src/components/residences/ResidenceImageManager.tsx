import { useRef } from "react";
import { ArrowUp, ArrowDown, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResidenceImages } from "@/hooks/useResidences";
import {
  useUploadResidenceImage,
  useDeleteResidenceImage,
  useReorderResidenceImages,
} from "@/hooks/useResidenceMutations";

/**
 * Galería de imágenes de una residencia: subir (Supabase Storage
 * bucket público `residence-images`), reordenar con flechas arriba/
 * abajo (actualiza sort_order) y eliminar.
 *
 * @example <ResidenceImageManager residenceId={residence.id} />
 */
export function ResidenceImageManager({ residenceId }: { residenceId: string }) {
  const { data: images } = useResidenceImages(residenceId);
  const uploadImage = useUploadResidenceImage(residenceId);
  const deleteImage = useDeleteResidenceImage(residenceId);
  const reorderImages = useReorderResidenceImages(residenceId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage.mutate({ file, nextSortOrder: (images?.length ?? 0) + 1 });
    e.target.value = "";
  }

  function move(index: number, direction: -1 | 1) {
    if (!images) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const a = images[index];
    const b = images[targetIndex];
    if (!a || !b) return;
    reorderImages.mutate([
      { id: a.id, sort_order: b.sort_order },
      { id: b.id, sort_order: a.sort_order },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images?.map((img, index) => (
          <div key={img.id} className="group relative overflow-hidden rounded-md border">
            <img src={img.url} alt={img.caption ?? ""} className="h-32 w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded bg-white/90 p-1 disabled:opacity-40">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === (images?.length ?? 0) - 1} className="rounded bg-white/90 p-1 disabled:opacity-40">
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => deleteImage.mutate({ imageId: img.id, url: img.url })}
                className="rounded bg-white/90 p-1 text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadImage.isPending}>
        <Upload className="mr-1 h-3.5 w-3.5" /> Subir imagen
      </Button>
    </div>
  );
}
