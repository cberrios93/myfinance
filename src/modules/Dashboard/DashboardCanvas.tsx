import { useState } from 'react'
import { ReactGridLayout, WidthProvider, type Layout, type LayoutItem } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import { LayoutGrid, Plus, RotateCcw, X } from 'lucide-react'
import type { DashboardData } from './useDashboardData'
import { DASHBOARD_LAYOUT_VERSION, type DashboardLayout } from '../../data/types'
import { DashboardView } from './DashboardView'
import { useDashboardLayout } from './useDashboardLayout'
import { DEFAULT_LAYOUT } from './DEFAULT_LAYOUT'
import { TILE_CATALOG, TILE_BY_ID } from './TileCatalog'
import { TILE_COMPONENTS } from './tiles/registry'

const Grid = WidthProvider(ReactGridLayout)
// 60 columnas = mcm(5 KPIs, 3 charts/listas, 4 chips) → todas las filas dividen parejo.
const COLS = 60
const ROW_H = 36
const MARGIN: readonly [number, number] = [8, 8]
const CONTAINER_PADDING: readonly [number, number] = [0, 0]

function toRgl(layout: DashboardLayout): LayoutItem[] {
  return layout.tiles
    .filter(t => TILE_BY_ID[t.id])
    .map(t => {
      const c = TILE_BY_ID[t.id]
      return { i: t.id, x: t.x, y: t.y, w: t.w, h: t.h, minW: c.minW, minH: c.minH }
    })
}

function fromRgl(items: Layout): DashboardLayout {
  return { version: DASHBOARD_LAYOUT_VERSION, tiles: items.map(l => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h })) }
}

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
  padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-borde)',
  background: 'var(--color-card)', color: 'var(--color-texto)', cursor: 'pointer',
}

export function DashboardCanvas({ d }: { d: DashboardData }) {
  const { layout, isCustom, save, reset } = useDashboardLayout(DEFAULT_LAYOUT)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [draft, setDraft] = useState<DashboardLayout>(DEFAULT_LAYOUT)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  // En móvil no hay canvas — el dashboard apilado de siempre (se afina en Etapa 4).
  if (d.isMobile) return <DashboardView d={d} />

  function enterEdit() {
    setDraft(isCustom ? layout : DEFAULT_LAYOUT)
    setPaletteOpen(false)
    setMode('edit')
  }

  function cancelEdit() {
    setPaletteOpen(false)
    setMode('view')
  }

  async function guardar() {
    setSaving(true)
    try {
      await save(draft)
      setMode('view')
    } catch {
      /* el hook ya expone el error; se mantiene en edición para reintentar */
    } finally {
      setSaving(false)
    }
  }

  function addTile(id: string) {
    const c = TILE_BY_ID[id]
    // Se agrega arriba a la izquierda; la compactación vertical empuja el resto.
    setDraft({ version: DASHBOARD_LAYOUT_VERSION, tiles: [{ id, x: 0, y: 0, w: c.defW, h: c.defH }, ...draft.tiles] })
    setPaletteOpen(false)
  }

  async function quitarPersonalizacion() {
    setResetting(true)
    try {
      await reset()
      setMode('view')
    } catch {
      /* el hook expone el error */
    } finally {
      setResetting(false)
    }
  }

  function removeTile(id: string) {
    setDraft({ version: DASHBOARD_LAYOUT_VERSION, tiles: draft.tiles.filter(t => t.id !== id) })
  }

  const editing = mode === 'edit'
  const active = editing ? draft : layout

  // Vista sin personalizar → dashboard clásico pixel-idéntico + botón compacto solo-ícono.
  if (!editing && !isCustom) {
    return (
      <div style={{ position: 'relative' }}>
        <button onClick={enterEdit} title="Personalizar dashboard"
          style={{
            position: 'absolute', top: 0, right: 0, zIndex: 20, width: 28, height: 28, borderRadius: 8,
            border: '1px solid var(--color-borde)', background: 'var(--color-card)', color: 'var(--color-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9,
          }}>
          <LayoutGrid size={14} />
        </button>
        <DashboardView d={d} />
      </div>
    )
  }

  const usedIds = new Set(active.tiles.map(t => t.id))
  const missing = TILE_CATALOG.filter(t => !usedIds.has(t.id))

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        .rgl-cell > * { height: 100%; }
        .rgl-cell { overflow: hidden; }
        .dash-canvas .react-grid-item.react-grid-placeholder { background: var(--color-acento); opacity: 0.15; border-radius: 12px; }
      `}</style>

      {/* Barra superior */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <div style={{ position: 'relative' }}>
              <button style={btnStyle} onClick={() => setPaletteOpen(o => !o)} disabled={missing.length === 0}>
                <Plus size={13} /> Agregar mosaico
              </button>
              {paletteOpen && missing.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 30,
                  background: 'var(--color-card)', border: '1px solid var(--color-borde)', borderRadius: 8,
                  padding: 6, minWidth: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 320, overflowY: 'auto',
                }}>
                  {missing.map(t => (
                    <button key={t.id} onClick={() => addTile(t.id)}
                      style={{ ...btnStyle, border: 'none', background: 'transparent', justifyContent: 'flex-start', width: '100%' }}>
                      {t.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button style={btnStyle} onClick={() => setDraft(DEFAULT_LAYOUT)}><RotateCcw size={13} /> Restablecer</button>
            <div style={{ flex: 1 }} />
            <button style={btnStyle} onClick={cancelEdit}>Cancelar</button>
            <button style={{ ...btnStyle, background: 'var(--color-acento)', borderColor: 'var(--color-acento)', color: '#06121f' }}
              onClick={guardar} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        ) : (
          <>
            <div style={{ flex: 1 }} />
            <button style={btnStyle} onClick={quitarPersonalizacion} disabled={resetting}>
              {resetting ? 'Restableciendo…' : 'Quitar personalización'}
            </button>
            <button style={btnStyle} onClick={enterEdit}><LayoutGrid size={13} /> Personalizar</button>
          </>
        )}
      </div>

      {active.tiles.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '48px 16px', textAlign: 'center', color: 'var(--color-muted)',
          border: '1px dashed var(--color-borde)', borderRadius: 12,
        }}>
          <p style={{ fontSize: 13 }}>El dashboard está vacío.</p>
          <button style={btnStyle}
            onClick={editing ? () => setDraft(DEFAULT_LAYOUT) : quitarPersonalizacion}
            disabled={resetting}>
            <RotateCcw size={13} /> {editing ? 'Restablecer al layout por defecto' : 'Volver al dashboard clásico'}
          </button>
        </div>
      )}

      <Grid
        className="dash-canvas"
        layout={toRgl(active)}
        cols={COLS}
        rowHeight={ROW_H}
        margin={MARGIN}
        containerPadding={CONTAINER_PADDING}
        isDraggable={editing}
        isResizable={editing}
        onLayoutChange={(items: Layout) => { if (editing) setDraft(fromRgl(items)) }}
        compactType="vertical"
        draggableCancel=".tile-remove"
      >
        {active.tiles.filter(t => TILE_BY_ID[t.id]).map(t => {
          const Comp = TILE_COMPONENTS[t.id]
          return (
            <div key={t.id} className="rgl-cell"
              style={editing ? { outline: '1px dashed var(--color-borde)', outlineOffset: -1, position: 'relative' } : undefined}>
              {editing && (
                <button className="tile-remove" onClick={() => removeTile(t.id)} title="Quitar"
                  style={{
                    position: 'absolute', top: 4, right: 4, zIndex: 5, width: 20, height: 20, borderRadius: 4,
                    border: '1px solid var(--color-borde)', background: 'var(--color-card)', color: 'var(--color-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <X size={12} />
                </button>
              )}
              {Comp ? <Comp d={d} /> : null}
            </div>
          )
        })}
      </Grid>
    </div>
  )
}
