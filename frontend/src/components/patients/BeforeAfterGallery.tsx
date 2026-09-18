import { useRef, useState, useEffect } from 'react'
import { Camera, Trash2, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  usePatientAttachments,
  useUploadPatientAttachment,
  useDeletePatientAttachment,
  type PatientAttachment,
} from '@/hooks/api/attachments'
import { api } from '@/lib/api'

interface Props {
  patientId: string
}

/** Carrega a imagem como blob URL para exibição inline (acesso autenticado). */
function useImageBlobUrl(patientId: string, attachment: PatientAttachment) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string
    api
      .get(`/patients/${patientId}/attachments/${attachment.id}/download`, { responseType: 'blob' })
      .then(r => {
        objectUrl = URL.createObjectURL(r.data as Blob)
        setUrl(objectUrl)
      })
      .catch(() => setUrl(null))

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [patientId, attachment.id])

  return url
}

function PhotoCard({
  patientId,
  attachment,
  onDelete,
}: {
  patientId: string
  attachment: PatientAttachment
  onDelete: (id: string) => void
}) {
  const url = useImageBlobUrl(patientId, attachment)

  return (
    <div className="relative group rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 aspect-square">
      {url ? (
        <img
          src={url}
          alt={attachment.filename}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
        </div>
      )}

      {/* Overlay com nome do arquivo */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{attachment.filename}</p>
      </div>

      {/* Botão de excluir */}
      <button
        onClick={() => onDelete(attachment.id)}
        aria-label="Excluir foto"
        className="absolute top-2 right-2 p-1 rounded-lg bg-white/80 hover:bg-red-50 text-neutral-500 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

/**
 * Galeria de fotos antes/depois para esteticistas.
 * Exibir somente quando `hasAestheticsModules(profession)` for verdadeiro.
 */
export default function BeforeAfterGallery({ patientId }: Props) {
  const { data: allAttachments = [], isLoading } = usePatientAttachments(patientId)
  const photos = allAttachments.filter(a => a.kind === 'before_after_photo')

  const upload = useUploadPatientAttachment(patientId)
  const deleteAttachment = useDeletePatientAttachment(patientId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Envie uma imagem JPEG, PNG ou WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10 MB.')
      return
    }

    setUploading(true)
    try {
      await upload.mutateAsync({ file, kind: 'before_after_photo' })
      toast.success('Foto adicionada ao acompanhamento.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Não foi possível enviar a foto.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(attachmentId: string) {
    if (!window.confirm('Excluir esta foto? Essa ação não pode ser desfeita.')) return
    try {
      await deleteAttachment.mutateAsync(attachmentId)
      toast.success('Foto excluída.')
    } catch {
      toast.error('Não foi possível excluir a foto.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-800">Fotos — Antes &amp; Depois</h3>
          <p className="text-sm text-neutral-500">Acompanhe a evolução visual do tratamento estético.</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          Adicionar foto
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {/* Grade de fotos */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 py-14 text-center">
          <Camera className="w-10 h-10 text-neutral-300 mb-3" />
          <p className="text-sm font-medium text-neutral-500">Nenhuma foto registrada.</p>
          <p className="text-xs text-neutral-400 mt-1">
            Adicione a primeira foto para acompanhar a evolução.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => (
            <PhotoCard
              key={photo.id}
              patientId={patientId}
              attachment={photo}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Aviso LGPD */}
      <div className="flex items-start gap-2 rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2">
        <ShieldCheck className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-neutral-500">
          Fotos armazenadas com criptografia e protegidas pela LGPD (Lei 13.709/2018).
          O acesso é restrito ao profissional responsável pelo atendimento.
        </p>
      </div>
    </div>
  )
}
