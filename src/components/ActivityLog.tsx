'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ActivityLogItem {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading activity logs:', error);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    }

    fetchLogs();
  }, [supabase]);

  if (loading) return <p className="p-4 text-gray-500">Loading vault activity...</p>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 max-w-2xl mx-auto my-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span>📜</span> Vault Activity Log
      </h2>
      {logs.length === 0 ? (
        <p className="text-gray-500 italic">No recent activity found.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {logs.map((log) => (
            <li key={log.id} className="py-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{log.description}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-600">
                  {log.action_type}
                </span>
              </div>
              <time className="text-xs text-gray-400 text-right">
                {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                <br />
                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}