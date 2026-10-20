import React, { useState } from 'react';
import { X, Calculator, Layers, Box, Cpu } from 'lucide-react';

export default function ConstructionCalculatorModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('concrete'); // 'concrete' | 'steel' | 'bricks'

  // Concrete state
  const [concLength, setConcLength] = useState(20);
  const [concWidth, setConcWidth] = useState(15);
  const [concThickness, setConcThickness] = useState(5); // inches
  const [concMix, setConcMix] = useState('1:1.5:3'); // M20

  // Steel state
  const [rebarDia, setRebarDia] = useState(12); // mm
  const [rebarLengthMeters, setRebarLengthMeters] = useState(120); // total meters

  // Brick state
  const [wallLength, setWallLength] = useState(30); // ft
  const [wallHeight, setWallHeight] = useState(10); // ft
  const [wallThickness, setWallThickness] = useState(9); // 4.5 or 9 inches

  if (!isOpen) return null;

  // 1. Concrete calculation
  const wetVolumeCft = (concLength * concWidth * (concThickness / 12));
  const dryVolumeCft = wetVolumeCft * 1.54; // standard 54% dry bulking factor
  let mixParts = 1 + 1.5 + 3;
  if (concMix === '1:1:2') mixParts = 4;
  if (concMix === '1:2:4') mixParts = 7;

  const cementVolumeCft = (dryVolumeCft / mixParts);
  const cementBags = Math.ceil(cementVolumeCft / 1.226); // 1 bag 50kg = ~1.226 cft
  const sandCft = Math.round((cementVolumeCft * (concMix === '1:1.5:3' ? 1.5 : (concMix === '1:1:2' ? 1 : 2))));
  const aggregateCft = Math.round((cementVolumeCft * (concMix === '1:1.5:3' ? 3 : (concMix === '1:1:2' ? 2 : 4))));

  // 2. Steel calculation: Weight per meter = (d^2 / 162)
  const weightPerMeter = (rebarDia * rebarDia) / 162.2;
  const totalSteelKg = (weightPerMeter * rebarLengthMeters).toFixed(1);
  const totalSteelTonnes = (totalSteelKg / 1000).toFixed(3);
  const barsCount = Math.ceil(rebarLengthMeters / 12);

  // 3. Brick calculation: Standard Indian brick volume with mortar = 0.0583 cft
  const wallVolumeCft = wallLength * wallHeight * (wallThickness / 12);
  const bricksRequired = Math.ceil(wallVolumeCft * (wallThickness === 4.5 ? 4.5 : 13.5) * 1.10); // with 10% wastage

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--amber-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={22} color="var(--amber-dark)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Civil Materials Estimator</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>Standard IS-compliant structural engineering calculations</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
          <button
            onClick={() => setActiveTab('concrete')}
            style={{
              flex: 1,
              padding: '0.75rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'concrete' ? '#ffffff' : 'transparent',
              color: activeTab === 'concrete' ? 'var(--amber-dark)' : 'var(--text-muted)',
              borderBottom: activeTab === 'concrete' ? '2px solid var(--amber-primary)' : 'none'
            }}
          >
            Concrete & Cement
          </button>
          <button
            onClick={() => setActiveTab('steel')}
            style={{
              flex: 1,
              padding: '0.75rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'steel' ? '#ffffff' : 'transparent',
              color: activeTab === 'steel' ? 'var(--amber-dark)' : 'var(--text-muted)',
              borderBottom: activeTab === 'steel' ? '2px solid var(--amber-primary)' : 'none'
            }}
          >
            TMT Steel Rebar Weight
          </button>
          <button
            onClick={() => setActiveTab('bricks')}
            style={{
              flex: 1,
              padding: '0.75rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'bricks' ? '#ffffff' : 'transparent',
              color: activeTab === 'bricks' ? 'var(--amber-dark)' : 'var(--text-muted)',
              borderBottom: activeTab === 'bricks' ? '2px solid var(--amber-primary)' : 'none'
            }}
          >
            Brickwork Masonry
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'concrete' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Calculate exact cement bags (50kg), M-Sand, and aggregate required for slab casting, footing, or beam pours.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Length (ft)</label>
                  <input type="number" min="1" className="form-control" value={concLength} onChange={(e) => setConcLength(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Width (ft)</label>
                  <input type="number" min="1" className="form-control" value={concWidth} onChange={(e) => setConcWidth(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Thickness (inches)</label>
                  <input type="number" min="1" className="form-control" value={concThickness} onChange={(e) => setConcThickness(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Grade Mix</label>
                  <select className="form-control" value={concMix} onChange={(e) => setConcMix(e.target.value)}>
                    <option value="1:1.5:3">M20 (1 : 1.5 : 3)</option>
                    <option value="1:1:2">M25 (1 : 1 : 2)</option>
                    <option value="1:2:4">M15 (1 : 2 : 4)</option>
                  </select>
                </div>
              </div>

              {/* Result Summary Box */}
              <div style={{ backgroundColor: 'var(--amber-subtle)', border: '1px solid var(--amber-border)', borderRadius: 12, padding: '1.25rem' }}>
                <h4 style={{ color: 'var(--amber-dark)', marginBottom: '0.75rem', fontSize: '0.9375rem' }}>Estimated Bill of Quantities (BOQ):</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.875rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{cementBags}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>CEMENT BAGS (50kg)</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.875rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{sandCft}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>M-SAND (Cu. Ft.)</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.875rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{aggregateCft}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>20MM AGGREGATE (Cu. Ft.)</div>
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Total wet concrete pour: <strong>{wetVolumeCft.toFixed(1)} cft</strong> ({(wetVolumeCft / 35.315).toFixed(2)} m³)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'steel' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Determine tonnage and piece counts for standard Fe 500D / 550D TMT reinforcement rebars using standard unit weight formula <em>D² / 162.2 kg/m</em>.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Rebar Diameter</label>
                  <select className="form-control" value={rebarDia} onChange={(e) => setRebarDia(Number(e.target.value))}>
                    <option value={8}>8 mm (Slab/Stirrups)</option>
                    <option value={10}>10 mm (Slab/Lintel)</option>
                    <option value={12}>12 mm (Main Beam/Column)</option>
                    <option value={16}>16 mm (Heavy Column)</option>
                    <option value={20}>20 mm (Foundation Footing)</option>
                    <option value={25}>25 mm (Heavy Civil Girder)</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Total Running Length (Meters)</label>
                  <input type="number" min="1" className="form-control" value={rebarLengthMeters} onChange={(e) => setRebarLengthMeters(Number(e.target.value))} />
                </div>
              </div>

              {/* Steel Results */}
              <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '1.25rem' }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem', fontSize: '0.9375rem' }}>Rebar Weight & Ordering Breakdown:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.875rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--amber-dark)' }}>{totalSteelKg}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL WEIGHT (KG)</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.875rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{totalSteelTonnes}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>METRIC TONNES (MT)</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.875rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{barsCount}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>12-METER BARS</div>
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Unit weight: <strong>{weightPerMeter.toFixed(3)} kg / meter</strong> (approx {(weightPerMeter * 12).toFixed(2)} kg per single 12m length)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bricks' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Estimate red clay bricks or concrete blocks required for partition or structural boundary walls (includes 10% on-site breakage allowance).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Wall Length (ft)</label>
                  <input type="number" min="1" className="form-control" value={wallLength} onChange={(e) => setWallLength(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Wall Height (ft)</label>
                  <input type="number" min="1" className="form-control" value={wallHeight} onChange={(e) => setWallHeight(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Thickness</label>
                  <select className="form-control" value={wallThickness} onChange={(e) => setWallThickness(Number(e.target.value))}>
                    <option value={9}>9-inch (Main Structural Wall)</option>
                    <option value={4.5}>4.5-inch (Single Brick Partition)</option>
                  </select>
                </div>
              </div>

              {/* Brick Results */}
              <div style={{ backgroundColor: 'var(--amber-subtle)', border: '1px solid var(--amber-border)', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--primary)' }}>
                  {bricksRequired.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--amber-dark)', letterSpacing: 0.5 }}>
                  TOTAL BRICKS REQUIRED (INCL. 10% WASTAGE)
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Wall surface area: {wallLength * wallHeight} sq. ft. | Volume: {wallVolumeCft.toFixed(1)} cft
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-subtle)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-dark" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
