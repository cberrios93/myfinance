import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react'
import { useFinanceData } from '../../data/FinanceDataContext'
import type { Nota } from '../../data/types'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'

const inputStyle = { background: 'var(--color-fondo)', color: 'var(--color-texto)', border: '1px solid var(--color-borde)' }

const EMPTY: Omit<Nota, 'id' | 'creadoEn' | 'actualizadoEn'> = {
  titulo: '', contenido: '', tags: [],
}

function NotaForm({ value, onChange, onSave, onCancel }: {
  value: Omit<Nota, 'id' | 'creadoEn' | 'actualizadoEn'>
  onChange: (v: any) => void; onSave: () => void; onCancel: () => void
}) {
  useSubmitOnCmdEnter(onSave)
  const [tagInput, setTagInput] = useState('')

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !value.tags.includes(t)) {
      onChange({ ...value, tags: [...value.tags, t] })
    }
    setTagInput('')
  }
  function removeTag(t: string) {
    onChange({ ...value, tags: value.tags.filter(x => x !== t) })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Título</label>
        <input value={value.titulo} onChange={e => onChange({ ...value, titulo: e.target.value })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Título de la nota" autoFocus />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Contenido</label>
        <textarea value={value.contenido} onChange={e => onChange({ ...value, contenido: e.target.value })}
          rows={6} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y" style={inputStyle}
          placeholder="Escribe aquí tu idea, nota o referencia…" />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Tags</label>
        <div className="flex gap-2">
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Ej. idea, RiiV, finanzas" />
          <button onClick={addTag} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--color-acento)', color: '#fff' }}>+</button>
        </div>
        {value.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {value.tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-fondo)', color: 'var(--color-acento)', border: '1px solid var(--color-acento)' }}>
                {t}
                <button onClick={() => removeTag(t)} className="hover:opacity-70"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: 'var(--color-acento)' }}>
          <Check size={14} /> Guardar
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  )
}

export default function Notes() {
  const { notas, loading, agregarNota, actualizarNota, borrarNota } = useFinanceData()
  const [adding, setAdding] = useState(false)
  const [newDraft, setNewDraft] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Nota | null>(null)
  const [tagFiltro, setTagFiltro] = useState<string | null>(null)

  const allTags = [...new Set(notas.flatMap(n => n.tags))].sort()
  const filtered = tagFiltro ? notas.filter(n => n.tags.includes(tagFiltro)) : notas

  async function handleAdd() {
    if (!newDraft.titulo.trim()) return
    await agregarNota(newDraft)
    setAdding(false); setNewDraft({ ...EMPTY })
  }
  async function handleSaveEdit() {
    if (!editDraft) return
    await actualizarNota(editDraft)
    setEditingId(null); setEditDraft(null)
  }

  if (loading) return <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>Cargando…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-texto)' }}>Ideas &amp; Notas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{notas.length} nota{notas.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setAdding(true); setNewDraft({ ...EMPTY }) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--color-acento)' }}>
          <Plus size={16} /> Nueva nota
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTagFiltro(null)}
            className="text-xs px-3 py-1 rounded-full" style={{ background: tagFiltro === null ? 'var(--color-acento)' : 'var(--color-fondo)', color: tagFiltro === null ? '#fff' : 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
            Todas
          </button>
          {allTags.map(t => (
            <button key={t} onClick={() => setTagFiltro(tagFiltro === t ? null : t)}
              className="flex items-center gap-1 text-xs px-3 py-1 rounded-full" style={{ background: tagFiltro === t ? 'var(--color-acento)' : 'var(--color-fondo)', color: tagFiltro === t ? '#fff' : 'var(--color-muted)', border: '1px solid var(--color-borde)' }}>
              <Tag size={10} /> {t}
            </button>
          ))}
        </div>
      )}

      {adding && (
        <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-texto)' }}>Nueva nota</p>
          <NotaForm value={newDraft} onChange={setNewDraft} onSave={handleAdd} onCancel={() => { setAdding(false); setNewDraft({ ...EMPTY }) }} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map(n => {
          if (editingId === n.id && editDraft) {
            return (
              <div key={n.id} className="rounded-xl p-4 sm:col-span-2" style={{ background: 'var(--color-card)', border: '2px solid var(--color-acento)' }}>
                <NotaForm value={editDraft} onChange={setEditDraft} onSave={handleSaveEdit} onCancel={() => { setEditingId(null); setEditDraft(null) }} />
              </div>
            )
          }
          return (
            <div key={n.id} className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-borde)' }}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--color-texto)' }}>{n.titulo}</h3>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditingId(n.id); setEditDraft({ ...n }) }} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Edit2 size={13} /></button>
                  <button onClick={() => borrarNota(n.id)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-muted)' }}><Trash2 size={13} /></button>
                </div>
              </div>
              {n.contenido && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed flex-1" style={{ color: 'var(--color-muted)' }}>{n.contenido}</p>
              )}
              {n.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-auto">
                  {n.tags.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full cursor-pointer" onClick={() => setTagFiltro(t)}
                      style={{ background: 'var(--color-fondo)', color: 'var(--color-acento)', border: '1px solid var(--color-acento)' }}>{t}</span>
                  ))}
                </div>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--color-borde)' }}>{new Date(n.actualizadoEn).toLocaleDateString('es-PE')}</p>
            </div>
          )
        })}
        {filtered.length === 0 && !adding && (
          <div className="text-center py-12 text-sm sm:col-span-2" style={{ color: 'var(--color-muted)' }}>
            {tagFiltro ? `Sin notas con tag "${tagFiltro}".` : 'Sin notas registradas.'}
          </div>
        )}
      </div>
    </div>
  )
}
