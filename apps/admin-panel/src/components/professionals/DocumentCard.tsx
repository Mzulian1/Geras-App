import { useState } from "react";
import { FileText, ExternalLink, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { VerificationBadge } from "@/components/professionals/VerificationBadge";
import { useReviewDocument } from "@/hooks/useProfessionalMutations";
import { getSignedDocumentUrl } from "@/lib/storage";
import { formatDateTime } from "@/lib/format";
import type { ProfessionalDocument, DocumentType } from "@geras/shared";

const TYPE_LABELS: Record<DocumentType, string> = {
  national_id: "Cédula de identidad",
  background_check: "Certificado de antecedentes",
  professional_title: "Título profesional",
  complementary_cert: "Certificado complementario",
  professional_registry: "Registro profesional",
  work_reference: "Referencia laboral",
  other: "Otro documento",
};

interface DocumentCardProps {
  document: ProfessionalDocument;
  professionalId: string;
}

/**
 * Card de un documento de verificación: tipo, estado, botón "Ver
 * archivo" (genera URL firmada al vuelo, el bucket es privado) y
 * Aprobar/Rechazar con nota del revisor.
 *
 * @example <DocumentCard document={doc} professionalId={profile.id} />
 */
export function DocumentCard({ document, professionalId }: DocumentCardProps) {
  const [dialogMode, setDialogMode] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [opening, setOpening] = useState(false);
  const reviewDocument = useReviewDocument();

  async function handleViewFile() {
    setOpening(true);
    try {
      const url = await getSignedDocumentUrl(document.file_url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error("No se pudo abrir el documento", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setOpening(false);
    }
  }

  function handleConfirm() {
    if (!dialogMode) return;
    reviewDocument.mutate(
      { documentId: document.id, professionalId, status: dialogMode, notes: note },
      { onSuccess: () => setDialogMode(null) }
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium">{TYPE_LABELS[document.document_type]}</div>
          <div className="text-xs text-muted-foreground">
            Subido {formatDateTime(document.created_at)}
            {document.reviewed_at && ` · Revisado ${formatDateTime(document.reviewed_at)}`}
          </div>
          {document.notes && <div className="mt-1 text-xs italic text-muted-foreground">"{document.notes}"</div>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <VerificationBadge status={document.status} />
        <Button variant="outline" size="sm" onClick={handleViewFile} disabled={opening}>
          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Ver archivo
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDialogMode("approved")}>
          <Check className="mr-1 h-3.5 w-3.5" /> Aprobar
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDialogMode("rejected")}>
          <X className="mr-1 h-3.5 w-3.5" /> Rechazar
        </Button>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "approved" ? "Aprobar documento" : "Rechazar documento"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Nota para el profesional (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={reviewDocument.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
