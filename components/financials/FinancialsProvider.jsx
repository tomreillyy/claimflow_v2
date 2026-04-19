'use client';
import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { computeDerived } from '@/lib/financialsCompute';
import { supabase } from '@/lib/supabaseClient';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

const FinancialsContext = createContext(null);

export function useFinancials() {
  const ctx = useContext(FinancialsContext);
  if (!ctx) throw new Error('useFinancials must be used within FinancialsProvider');
  return ctx;
}

const initialState = {
  turnover: null,
  turnoverBand: null,
  activities: [],
  team: [],
  contractors: [],
  materials: [],
  overheads: [],
  depreciation: [],
  adjustments: [],
  loading: true,
  saving: {},
  errors: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_ALL':
      return { ...state, ...action.payload, loading: false };

    case 'SET_TURNOVER':
      return { ...state, turnover: action.value };

    // --- Team ---
    case 'ADD_TEAM_MEMBER':
      return { ...state, team: [...state.team, action.member] };
    case 'UPDATE_TEAM_MEMBER':
      return {
        ...state,
        team: state.team.map(m =>
          m.id === action.id ? { ...m, [action.field]: action.value } : m
        ),
      };
    case 'DELETE_TEAM_MEMBER':
      return { ...state, team: state.team.filter(m => m.id !== action.id) };
    case 'SET_SPLITS':
      return {
        ...state,
        team: state.team.map(m =>
          m.id === action.memberId ? { ...m, splits: action.splits } : m
        ),
      };

    // --- Expenditure tables (same pattern for each) ---
    case 'ADD_ITEM':
      return { ...state, [action.section]: [...state[action.section], action.item] };
    case 'UPDATE_ITEM':
      return {
        ...state,
        [action.section]: state[action.section].map(item =>
          item.id === action.id ? { ...item, [action.field]: action.value } : item
        ),
      };
    case 'DELETE_ITEM':
      return {
        ...state,
        [action.section]: state[action.section].filter(item => item.id !== action.id),
      };
    case 'REPLACE_ITEM':
      return {
        ...state,
        [action.section]: state[action.section].map(item =>
          item.id === action.id ? action.item : item
        ),
      };

    // --- Adjustments ---
    case 'SET_ADJUSTMENTS':
      return { ...state, adjustments: action.adjustments };
    case 'UPDATE_ADJUSTMENT': {
      const existing = state.adjustments.find(a => a.adjustment_type === action.adjustmentType);
      if (existing) {
        return {
          ...state,
          adjustments: state.adjustments.map(a =>
            a.adjustment_type === action.adjustmentType
              ? { ...a, [action.field]: action.value }
              : a
          ),
        };
      }
      return {
        ...state,
        adjustments: [...state.adjustments, {
          adjustment_type: action.adjustmentType,
          [action.field]: action.value,
          applies: false,
          amount: 0,
        }],
      };
    }

    // --- Saving/error state ---
    case 'SET_SAVING':
      return { ...state, saving: { ...state.saving, [action.key]: action.value } };
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.key]: action.value } };

    default:
      return state;
  }
}

export default function FinancialsProvider({ token, activities, children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const tokenRef = useRef(token);
  const activitiesRef = useRef(activities);
  const fetchedRef = useRef(false);
  tokenRef.current = token;
  activitiesRef.current = activities;

  // Compute derived values on every state change
  const derived = computeDerived(state);

  // Initial data fetch — runs once
  const fetchAll = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/projects/${tokenRef.current}/financials`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error('Failed to fetch financials');
      const data = await res.json();
      dispatch({
        type: 'LOAD_ALL',
        payload: {
          turnover: data.turnover,
          turnoverBand: data.turnoverBand,
          team: data.team || [],
          contractors: data.contractors || [],
          materials: data.materials || [],
          overheads: data.overheads || [],
          depreciation: data.depreciation || [],
          adjustments: data.adjustments || [],
          activities: activitiesRef.current,
        },
      });
    } catch (err) {
      console.error('Failed to load financials:', err);
      dispatch({ type: 'LOAD_ALL', payload: { activities: activitiesRef.current } });
    }
  }, []); // no deps — fetch once

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchAll();
    }
  }, [fetchAll]);

  // Update activities list when it changes externally (without re-fetching)
  useEffect(() => {
    if (!state.loading && activities) {
      dispatch({ type: 'LOAD_ALL', payload: { ...state, activities, loading: false } });
    }
  }, [activities?.length]); // only when count changes, not reference

  // Debounced API save helper
  const saveField = useCallback(async (url, method, body, saveKey) => {
    dispatch({ type: 'SET_SAVING', key: saveKey, value: true });
    dispatch({ type: 'SET_ERROR', key: saveKey, value: null });
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: method === 'DELETE' ? undefined : JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Save failed');
      }
      const data = await res.json();
      return data;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', key: saveKey, value: err.message });
      console.error(`Save failed [${saveKey}]:`, err);
      return null;
    } finally {
      dispatch({ type: 'SET_SAVING', key: saveKey, value: false });
    }
  }, []);

  const api = {
    // Team
    addTeamMember: async (memberData = {}) => {
      const data = await saveField(
        `/api/projects/${tokenRef.current}/financials/team`,
        'POST',
        memberData,
        'add_team'
      );
      if (data?.member) {
        dispatch({ type: 'ADD_TEAM_MEMBER', member: { ...data.member, splits: [] } });
        return data.member;
      }
    },

    updateTeamMember: async (id, field, value) => {
      dispatch({ type: 'UPDATE_TEAM_MEMBER', id, field, value });
      await saveField(
        `/api/projects/${tokenRef.current}/financials/team/${id}`,
        'PUT',
        { [field]: value },
        `team_${id}_${field}`
      );
    },

    deleteTeamMember: async (id) => {
      dispatch({ type: 'DELETE_TEAM_MEMBER', id });
      await saveField(
        `/api/projects/${tokenRef.current}/financials/team/${id}`,
        'DELETE',
        {},
        `delete_team_${id}`
      );
    },

    saveSplits: async (memberId, splits) => {
      dispatch({ type: 'SET_SPLITS', memberId, splits });
      await saveField(
        `/api/projects/${tokenRef.current}/financials/team/${memberId}/splits`,
        'PUT',
        { splits },
        `splits_${memberId}`
      );
    },

    // Generic CRUD for expenditure sections
    addItem: async (section, itemData = {}) => {
      const data = await saveField(
        `/api/projects/${tokenRef.current}/financials/${section}`,
        'POST',
        itemData,
        `add_${section}`
      );
      if (data?.item) {
        dispatch({ type: 'ADD_ITEM', section, item: data.item });
        return data.item;
      }
    },

    updateItem: async (section, id, field, value) => {
      dispatch({ type: 'UPDATE_ITEM', section, id, field, value });
      const data = await saveField(
        `/api/projects/${tokenRef.current}/financials/${section}/${id}`,
        'PUT',
        { [field]: value },
        `${section}_${id}_${field}`
      );
      // Replace with server response to get joined activity data
      if (data?.item) {
        dispatch({ type: 'REPLACE_ITEM', section, id, item: data.item });
      }
    },

    deleteItem: async (section, id) => {
      dispatch({ type: 'DELETE_ITEM', section, id });
      await saveField(
        `/api/projects/${tokenRef.current}/financials/${section}/${id}`,
        'DELETE',
        {},
        `delete_${section}_${id}`
      );
    },

    // Adjustments
    updateAdjustment: async (adjustmentType, field, value) => {
      dispatch({ type: 'UPDATE_ADJUSTMENT', adjustmentType, field, value });
      // Debounce full save
      const adjs = state.adjustments.map(a =>
        a.adjustment_type === adjustmentType ? { ...a, [field]: value } : a
      );
      // Ensure all 3 types exist
      for (const t of ['feedstock', 'recoupment', 'balancing']) {
        if (!adjs.find(a => a.adjustment_type === t)) {
          adjs.push({ adjustment_type: t, applies: false, amount: 0 });
        }
      }
      await saveField(
        `/api/projects/${tokenRef.current}/financials/adjustments`,
        'PUT',
        { adjustments: adjs },
        `adj_${adjustmentType}_${field}`
      );
    },

    refetch: fetchAll,
  };

  return (
    <FinancialsContext.Provider value={{ state, dispatch, derived, api }}>
      {children}
    </FinancialsContext.Provider>
  );
}
