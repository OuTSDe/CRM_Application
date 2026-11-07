import React from 'react'
import { WMElevation } from './WhiteModel.jsx'
import { FloorPlan, plateOf, plateRange, ordinal, tagOf } from './Tower.jsx'

// 8 Nov: the two drawings that go with a cost sheet. The tower elevation from the white model with the band and the
// chosen floor marked, and the floor plan of that floor type with the residence marked.

// The elevation now comes from the exterior white model (components/WhiteModel.jsx): real floor widths and levels.
export function ElevationDiagram({ unit }) {
  const floor = Number(unit?.floor)
  const isDuplex = floor === 43
  return <WMElevation className="elev-dia" numbers={false} mark={isDuplex ? [43, 44] : [floor]} markLabel={isDuplex ? '43rd/44th' : ordinal(floor)}
    title={`Tower elevation, ${ordinal(floor)} floor marked`} foot={`From the exterior white model · south elevation · residence ${unit?.unit || ''}`} />
}

export function UnitPlan({ unit }) {
  const floor = Number(unit?.floor), plate = plateOf(floor)
  const tag = tagOf(unit?.unit).tag
  if (!plate) return <p className="small muted">No plan drawing for this floor yet.</p>
  return <div className="unit-plan plate-light">
    <FloorPlan floor={floor} highlight={tag} statusOf={() => null} />
    <div className="small" style={{ marginTop: 4 }}><b>{plate.title}</b> ({plateRange(plate)}) · residence {unit.unit} is marked ({tag}{plate.units.find((u) => u.id === tag)?.typology ? ', ' + plate.units.find((u) => u.id === tag).typology : ''}).{floor === 43 ? ' Duplex: the upper level is on the 44th floor.' : ''}</div>
    {floor === 43 && plateOf(44) && <div style={{ marginTop: 8 }}><FloorPlan floor={44} highlight={tag} statusOf={() => null} /><div className="small">44th floor, duplex upper level</div></div>}
  </div>
}
