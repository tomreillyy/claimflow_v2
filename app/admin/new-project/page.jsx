'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { ArrowLeft, ArrowRight, SkipForward, Check } from 'lucide-react';

export default function NewProject() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [yearEnd, setYearEnd] = useState(new Date().getFullYear());

  // Step 2 fields (technical framing — all optional)
  const [technicalUncertainty, setTechnicalUncertainty] = useState('');
  const [knowledgeGap, setKnowledgeGap] = useState('');
  const [testingMethod, setTestingMethod] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  function handleNext(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    setError('');
    setStep(2);
  }

  async function createProject(includeTechnicalFraming) {
    setError('');
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be signed in to create a project');
        setSubmitting(false);
        return;
      }

      const body = {
        name: name.trim(),
        year: Number(year),
        year_end: Number(yearEnd),
        participants: [],
        owner_email: user.email,
      };

      if (includeTechnicalFraming) {
        if (technicalUncertainty.trim()) body.technical_uncertainty = technicalUncertainty.trim();
        if (knowledgeGap.trim()) body.knowledge_gap = knowledgeGap.trim();
        if (testingMethod.trim()) body.testing_method = testingMethod.trim();
        if (successCriteria.trim()) body.success_criteria = successCriteria.trim();
      }

      const resp = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body),
      });

      const json = await resp.json();
      if (!resp.ok) {
        setError(json.error || 'Failed to create project');
        setSubmitting(false);
        return;
      }

      // Redirect to the new project
      router.push(`/p/${json.project.project_token}`);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 16,
    border: '1px solid #ddd',
    borderRadius: 6,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    color: '#1a1a1a',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#333',
    marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <Header />
      <main style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: '48px 24px',
        lineHeight: 1.5
      }}>
        {/* Step indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 40,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#021048',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 600,
          }}>
            {step > 1 ? <Check size={16} /> : '1'}
          </div>
          <div style={{
            width: 48,
            height: 2,
            backgroundColor: step > 1 ? '#021048' : '#e5e5e5',
            borderRadius: 1,
            transition: 'background-color 0.3s',
          }} />
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: step === 2 ? '#021048' : '#e5e5e5',
            color: step === 2 ? 'white' : '#999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.3s',
          }}>
            2
          </div>
        </div>

        {/* STEP 1 — Project Basics */}
        {step === 1 && (
          <>
            <header style={{ textAlign: 'center', marginBottom: 36 }}>
              <h1 style={{
                fontSize: 26,
                fontWeight: 600,
                color: '#1a1a1a',
                margin: 0,
                marginBottom: 8,
              }}>New project</h1>
              <p style={{
                fontSize: 15,
                color: '#666',
                margin: 0,
              }}>Give your R&D project a name and year</p>
            </header>

            <form onSubmit={handleNext} style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={labelStyle}>Project name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder="e.g. Vision model v2"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#021048'}
                  onBlur={e => e.target.style.borderColor = '#ddd'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Start year</label>
                  <select
                    value={year}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setYear(v);
                      if (v > Number(yearEnd)) setYearEnd(v);
                    }}
                    required
                    style={{ ...inputStyle, backgroundColor: 'white' }}
                    onFocus={e => e.target.style.borderColor = '#021048'}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const yearOption = new Date().getFullYear() - i;
                      return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>End year</label>
                  <select
                    value={yearEnd}
                    onChange={e => setYearEnd(Number(e.target.value))}
                    required
                    style={{ ...inputStyle, backgroundColor: 'white' }}
                    onFocus={e => e.target.style.borderColor = '#021048'}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const yearOption = new Date().getFullYear() - i;
                      return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                    }).filter(opt => Number(opt.props.value) >= Number(year))}
                  </select>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: 12,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  fontSize: 14,
                  color: '#dc2626',
                }}>{error}</div>
              )}

              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: '#021048',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginTop: 8,
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#010a2e'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#021048'}
              >
                Next
                <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}

        {/* STEP 2 — Technical Framing */}
        {step === 2 && (
          <>
            <header style={{ textAlign: 'center', marginBottom: 36 }}>
              <h1 style={{
                fontSize: 26,
                fontWeight: 600,
                color: '#1a1a1a',
                margin: 0,
                marginBottom: 8,
              }}>Define the technical problem</h1>
              <p style={{
                fontSize: 15,
                color: '#666',
                margin: 0,
              }}>Optional — you can fill this in later from Project Details</p>
            </header>

            <div style={{ display: 'grid', gap: 24 }}>
              {[
                {
                  label: 'Technical uncertainty',
                  prompt: 'What outcome cannot be determined in advance?',
                  value: technicalUncertainty,
                  setter: setTechnicalUncertainty,
                  placeholder: 'e.g. Whether a transformer-based model can achieve >95% accuracy on our domain-specific OCR task with limited training data',
                },
                {
                  label: 'Knowledge gap',
                  prompt: "Why can't this be answered using existing knowledge?",
                  value: knowledgeGap,
                  setter: setKnowledgeGap,
                  placeholder: 'e.g. No published research addresses this specific combination of document types and resolution constraints',
                },
                {
                  label: 'How you\'re testing it',
                  prompt: 'What experiments or testing are you performing?',
                  value: testingMethod,
                  setter: setTestingMethod,
                  placeholder: 'e.g. Systematic evaluation of fine-tuned models across varying dataset sizes and augmentation strategies',
                },
                {
                  label: 'Success criteria',
                  prompt: 'How will you know if it worked?',
                  value: successCriteria,
                  setter: setSuccessCriteria,
                  placeholder: 'e.g. Model achieves >95% character-level accuracy on our held-out test set with <200ms inference time',
                },
              ].map((field) => (
                <div key={field.label}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    marginBottom: 4,
                  }}>{field.label}</label>
                  <p style={{
                    fontSize: 13,
                    color: '#666',
                    margin: '0 0 8px 0',
                  }}>{field.prompt}</p>
                  <textarea
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    style={{
                      ...inputStyle,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                    onFocus={e => e.target.style.borderColor = '#021048'}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  />
                </div>
              ))}
            </div>

            {error && (
              <div style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 6,
                fontSize: 14,
                color: '#dc2626',
              }}>{error}</div>
            )}

            <div style={{
              display: 'flex',
              gap: 12,
              marginTop: 32,
            }}>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#666',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <button
                type="button"
                onClick={() => createProject(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#666',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                <SkipForward size={16} />
                {submitting ? 'Creating...' : 'Skip for now'}
              </button>

              <button
                type="button"
                onClick={() => createProject(true)}
                disabled={submitting}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: submitting ? '#ccc' : '#021048',
                  border: 'none',
                  borderRadius: 6,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#010a2e'; }}
                onMouseOut={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#021048'; }}
              >
                {submitting ? 'Creating...' : 'Save & Continue'}
              </button>
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        input::placeholder, textarea::placeholder {
          color: #999 !important;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
