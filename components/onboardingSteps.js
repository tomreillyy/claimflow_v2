import {
  Sparkles, FolderPlus, FileText, Brain, BarChart3, DollarSign, FileOutput,
  UserPlus, Users, Mail, Upload, Github, StickyNote, Settings, Layers,
} from 'lucide-react';

const STEP_COLORS = {
  hypothesis: '#6366f1',
  experiment: '#0ea5e9',
  observation: '#10b981',
  evaluation: '#f59e0b',
  conclusion: '#8b5cf6',
};

const STEPS = ['Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion'];

function WelcomeVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'linear-gradient(135deg, #021048 0%, #1e3a8a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(2, 16, 72, 0.3)',
      }}>
        <Sparkles size={36} color="#fff" />
      </div>
      <div style={{
        display: 'flex', gap: 6, marginTop: 4,
      }}>
        {Object.values(STEP_COLORS).map((c, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', backgroundColor: c,
            opacity: 0.8,
          }} />
        ))}
      </div>
    </div>
  );
}

function ProjectFormVisual() {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 20, width: '80%', maxWidth: 280,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)',
    }}>
      {[
        { label: 'Project name', width: '70%' },
        { label: 'Financial year', width: '40%' },
        { label: 'Hypothesis', width: '100%' },
      ].map((field, i) => (
        <div key={i} style={{ marginBottom: i < 2 ? 12 : 0 }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{field.label}</div>
          <div style={{
            height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', width: field.width,
          }} />
        </div>
      ))}
    </div>
  );
}

function EvidenceSourcesVisual() {
  const sources = [
    { icon: Github, label: 'GitHub', color: '#1f2937' },
    { icon: Layers, label: 'Jira', color: '#0052cc' },
    { icon: Mail, label: 'Email inbox', color: '#10b981' },
    { icon: Upload, label: 'File upload', color: '#0ea5e9' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '80%', maxWidth: 280,
    }}>
      {sources.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', borderRadius: 10, padding: '10px 12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)',
        }}>
          <s.icon size={18} color={s.color} />
          <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function ActivitiesVisual() {
  const activities = [
    { name: 'Custom ML inference engine', coverage: [true, true, true, false, false] },
    { name: 'API rate-limit optimisation', coverage: [true, true, false, false, false] },
    { name: 'Database sharding approach', coverage: [true, false, false, false, false] },
  ];
  const colors = Object.values(STEP_COLORS);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '85%', maxWidth: 300 }}>
      {activities.map((act, i) => (
        <div key={i} style={{
          background: '#fff', borderRadius: 8, padding: '10px 14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#111827',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {act.name}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {act.coverage.map((filled, j) => (
              <div key={j} style={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: filled ? colors[j] : '#e2e8f0',
              }} />
            ))}
            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>
              {act.coverage.filter(Boolean).length}/5 steps
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CoverageBarsVisual() {
  const fills = [85, 60, 40, 70, 20];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '80%', maxWidth: 260 }}>
      {STEPS.map((step, i) => {
        const color = STEP_COLORS[step.toLowerCase()];
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500, width: 72, textAlign: 'right' }}>
              {step}
            </span>
            <div style={{
              flex: 1, height: 8, borderRadius: 4, backgroundColor: '#f1f5f9',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${fills[i]}%`, height: '100%', borderRadius: 4,
                backgroundColor: color, transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CostsVisual() {
  const rows = [
    { person: 'Alex Chen',    pct: 60, activity: 'ML inference engine' },
    { person: 'Sam Rivera',   pct: 40, activity: 'API optimisation'    },
    { person: 'Jordan Blake', pct: 80, activity: 'ML inference engine' },
  ];
  return (
    <div style={{
      background: '#fff', borderRadius: 12, width: '85%', maxWidth: 300,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', padding: '8px 14px', borderBottom: '1px solid #f1f5f9',
        fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase',
      }}>
        <span style={{ flex: 1 }}>Person</span>
        <span style={{ width: 36, textAlign: 'center' }}>R&D %</span>
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', padding: '8px 14px',
          borderBottom: i < rows.length - 1 ? '1px solid #f8fafc' : 'none',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{row.person}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
              {row.activity}
            </div>
          </div>
          <div style={{ width: 36, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#021048' }}>
            {row.pct}%
          </div>
        </div>
      ))}
    </div>
  );
}

function ClaimPackVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 64, height: 80, borderRadius: 8, backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <FileOutput size={28} color="#021048" />
        <div style={{
          position: 'absolute', top: -6, right: -10,
          backgroundColor: '#021048', color: '#fff', fontSize: 9, fontWeight: 700,
          padding: '2px 6px', borderRadius: 6,
        }}>
          PRO
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 120 }}>
        {[80, 60, 90].map((w, i) => (
          <div key={i} style={{
            height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', width: `${w}%`,
          }} />
        ))}
      </div>
    </div>
  );
}

function ConsultantWelcomeVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'linear-gradient(135deg, #021048 0%, #1e3a8a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(2, 16, 72, 0.3)',
      }}>
        <Users size={36} color="#fff" />
      </div>
      <div style={{
        fontSize: 11, color: '#64748b', fontWeight: 600,
        backgroundColor: '#f1f5f9', padding: '3px 10px', borderRadius: 8,
      }}>
        ADVISOR
      </div>
    </div>
  );
}

function AddClientVisual() {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 20, width: '80%', maxWidth: 280,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)',
    }}>
      {[
        { label: 'Client email', width: '80%' },
        { label: 'Company name', width: '60%' },
      ].map((field, i) => (
        <div key={i} style={{ marginBottom: i < 1 ? 12 : 0 }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{field.label}</div>
          <div style={{
            height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', width: field.width,
          }} />
        </div>
      ))}
      <div style={{
        marginTop: 14, backgroundColor: '#021048', color: '#fff',
        fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 6,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <UserPlus size={13} color="#fff" />
        Add client
      </div>
    </div>
  );
}

function ClientTableVisual() {
  const clients = [
    { name: 'Acme Corp', projects: 3, status: '#10b981' },
    { name: 'TechStart', projects: 1, status: '#f59e0b' },
    { name: 'BuildCo', projects: 2, status: '#6366f1' },
  ];
  return (
    <div style={{
      background: '#fff', borderRadius: 12, width: '85%', maxWidth: 300,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', padding: '8px 14px', borderBottom: '1px solid #f1f5f9',
        fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase',
      }}>
        <span style={{ flex: 1 }}>Client</span>
        <span style={{ width: 60, textAlign: 'center' }}>Projects</span>
        <span style={{ width: 50, textAlign: 'center' }}>Status</span>
      </div>
      {clients.map((c, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', padding: '8px 14px',
          borderBottom: i < 2 ? '1px solid #f8fafc' : 'none',
          fontSize: 12, color: '#374151',
        }}>
          <span style={{ flex: 1, fontWeight: 500 }}>{c.name}</span>
          <span style={{ width: 60, textAlign: 'center', color: '#64748b' }}>{c.projects}</span>
          <span style={{ width: 50, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c.status }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function ConsultantClaimPackVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 64, height: 80, borderRadius: 8, backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <FileOutput size={28} color="#021048" />
        <Settings size={12} color="#64748b" style={{ position: 'absolute', bottom: 6, right: 6 }} />
      </div>
      <div style={{
        fontSize: 10, color: '#64748b', fontWeight: 500,
        backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: 6,
      }}>
        Your branding
      </div>
    </div>
  );
}

export function getRegularUserSteps() {
  return [
    {
      id: 'welcome',
      title: 'Welcome to ClaimFlow',
      description: 'Capture R&D evidence as you work \u2014 so come tax time, your claim pack builds itself.',
      icon: Sparkles,
      renderVisual: () => <WelcomeVisual />,
    },
    {
      id: 'create-project',
      title: 'Create Your First Project',
      description: 'A project covers one financial year of R&D work and can contain multiple activities. Start by naming the project, setting the financial year, and writing your first hypothesis.',
      icon: FolderPlus,
      renderVisual: () => <ProjectFormVisual />,
    },
    {
      id: 'collect-evidence',
      title: 'Integrate With Your Favourite Tools',
      description: 'Connect GitHub and Jira to pull in commits and tickets automatically, or add evidence via quick notes, file uploads, and a dedicated email inbox. Everything gets timestamped as it arrives.',
      icon: FileText,
      renderVisual: () => <EvidenceSourcesVisual />,
    },
    {
      id: 'review-activities',
      title: 'Review & Adopt Your Activities',
      description: 'AI groups your evidence into named R&D activities. Review them in the Activities tab, adopt the ones that apply, and see which of the 5 R&D steps each activity covers.',
      icon: Brain,
      renderVisual: () => <ActivitiesVisual />,
    },
    {
      id: 'record-costs',
      title: 'Record Your R&D Costs',
      description: 'Upload your payroll data or enter costs manually. Then allocate each person\'s time across your R&D activities. This builds the financial evidence behind your claim.',
      icon: DollarSign,
      renderVisual: () => <CostsVisual />,
    },
    {
      id: 'claim-pack',
      title: 'Generate Your Claim Pack',
      description: 'When you\'re ready, generate a structured R&D claim pack from the Claim Pack tab \u2014 formatted for your tax advisor or the ATO.',
      icon: FileOutput,
      renderVisual: () => <ClaimPackVisual />,
    },
  ];
}

export function getConsultantSteps() {
  return [
    {
      id: 'welcome-consultant',
      title: 'Welcome, Advisor',
      description: 'ClaimFlow helps R&D advisors manage client evidence collection remotely. Your clients collect evidence \u2014 you review and generate claim packs.',
      icon: Sparkles,
      renderVisual: () => <ConsultantWelcomeVisual />,
    },
    {
      id: 'add-clients',
      title: 'Add Your Clients',
      description: 'Link clients by their email address. They\'ll receive a notification and you\'ll gain read access to their projects.',
      icon: UserPlus,
      renderVisual: () => <AddClientVisual />,
    },
    {
      id: 'view-projects',
      title: 'View Client Projects',
      description: 'Once a client is linked and creates projects, you can open any project to review their evidence, activities, costs, and coverage — just as if you were on their account.',
      icon: Users,
      renderVisual: () => <ClientTableVisual />,
    },
    {
      id: 'monitor-coverage',
      title: 'Monitor R&D Coverage',
      description: 'Each project tracks the 5-step R&D framework across its activities. Check which clients have coverage gaps and follow up to strengthen their claims.',
      icon: BarChart3,
      renderVisual: () => <CoverageBarsVisual />,
    },
    {
      id: 'claim-packs-consultant',
      title: 'Generate Claim Packs',
      description: 'Generate structured claim pack documents for your clients. Use your own branding via the Settings page.',
      icon: FileOutput,
      renderVisual: () => <ConsultantClaimPackVisual />,
    },
  ];
}
