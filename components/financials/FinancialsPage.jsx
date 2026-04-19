'use client';
import { useState } from 'react';
import FinancialsProvider from './FinancialsProvider';
import RunningTotalBar from './RunningTotalBar';
import TeamSection from './TeamSection';
import AssociatesSection from './AssociatesSection';
import ContractorsSection from './ContractorsSection';
import MaterialsSection from './MaterialsSection';
import OverheadsSection from './OverheadsSection';
import DepreciationSection from './DepreciationSection';
import AdjustmentsSection from './AdjustmentsSection';
import SchedulePreview from './SchedulePreview';
import ExportButton from './ExportButton';
import AuditDrawer from './AuditDrawer';

const NAVY = '#1e3a5f';

/**
 * Top-level Financials workspace.
 * Renders inside the WorkspaceView when the Financials tab is active.
 */
export default function FinancialsPage({ token, activities }) {
  const [showAudit, setShowAudit] = useState(false);

  return (
    <FinancialsProvider token={token} activities={activities}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 4px' }}>
        <RunningTotalBar />

        <TeamSection />

        <AssociatesSection />

        <ContractorsSection />

        <MaterialsSection />

        <OverheadsSection />

        <DepreciationSection />

        <AdjustmentsSection />

        <SchedulePreview />

        {/* Action bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          borderTop: '1px solid #e5e7eb',
          marginTop: 8,
        }}>
          <button
            onClick={() => setShowAudit(true)}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 500,
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            History
          </button>
          <ExportButton />
        </div>
      </div>

      <AuditDrawer token={token} isOpen={showAudit} onClose={() => setShowAudit(false)} />
    </FinancialsProvider>
  );
}
