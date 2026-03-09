import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI, chatAPI } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiUsers, FiPackage, FiCheckCircle, FiXCircle, FiTrendingUp,
  FiAlertTriangle, FiDownload, FiBarChart2, FiAward
} from 'react-icons/fi';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ZoomableImage } from '../components/ImagePreviewModal';
import './AdminPanel.css';

// ── Colour palette ─────────────────────────────────────────────
const COLORS = ['#2e8b57', '#5a9bbd', '#f0a500', '#e53935', '#8e44ad', '#16a085'];

// ── CSV helper ─────────────────────────────────────────────────
function downloadCSV(filename, rows, headers) {
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Monthly PDF/text report ────────────────────────────────────
function downloadMonthlyReport(items) {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const donated   = items.filter(i => i.status === 'donated').length;
  const received  = items.filter(i => i.receiverConfirmed).length;
  const available = items.filter(i => i.status === 'available').length;
  const pending   = items.filter(i => i.status === 'pending').length;
  const requested = items.filter(i => i.status === 'requested').length;

  const byCategory = {};
  items.forEach(i => { byCategory[i.category] = (byCategory[i.category] || 0) + 1; });

  const lines = [
    `DONATEO — MONTHLY REPORT`,
    `Period: ${month}`,
    `Generated: ${now.toLocaleString()}`,
    ``,
    `═══════════════════════════════`,
    `SUMMARY`,
    `═══════════════════════════════`,
    `Total Items Posted : ${items.length}`,
    `Items Donated      : ${donated}`,
    `Items Received     : ${received}`,
    `Items Available    : ${available}`,
    `Items Requested    : ${requested}`,
    `Pending Approval   : ${pending}`,
    ``,
    `═══════════════════════════════`,
    `BY CATEGORY`,
    `═══════════════════════════════`,
    ...Object.entries(byCategory).map(([cat, count]) => `${cat.padEnd(12)}: ${count}`),
    ``,
    `═══════════════════════════════`,
    `END OF REPORT`,
    `═══════════════════════════════`,
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Donateo_Report_${now.getFullYear()}_${now.getMonth() + 1}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Monthly report downloaded!');
}

// ══════════════════════════════════════════════════════════════
const AdminPanel = () => {
  const [stats, setStats]           = useState(null);
  const [users, setUsers]           = useState([]);
  const [items, setItems]           = useState([]);
  const [allItems, setAllItems]     = useState([]); // for charts/export
  const [chats, setChats]           = useState([]);
  const [selectedChat, setSelectedChat]   = useState(null);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [showChat, setShowChat]     = useState(false);
  const [activeTab, setActiveTab]   = useState('pending');
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const promises = [
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getItems({ status: activeTab === 'pending' ? 'pending' : undefined }),
      ];

      if (activeTab === 'chats' || activeTab === 'reports') promises.push(chatAPI.getAllChats());
      if (activeTab === 'analytics' || activeTab === 'leaderboard' || activeTab === 'export' || activeTab === 'monthly')
        promises.push(adminAPI.getItems({})); // all items for analytics

      const results = await Promise.all(promises);
      setStats(results[0].data);
      setUsers(results[1].data);
      setItems(results[2].data);
      if ((activeTab === 'chats' || activeTab === 'reports') && results[3]) setChats(results[3].data);
      if (['analytics','leaderboard','export','monthly'].includes(activeTab) && results[3]) setAllItems(results[3].data);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── handlers ──────────────────────────────────────────────
  const handleApproveItem = async (itemId) => {
    try { await adminAPI.approveItem(itemId); toast.success('Item approved!'); fetchData(); }
    catch { toast.error('Failed to approve item'); }
  };
  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('Remove this item?')) return;
    try { await adminAPI.removeItem(itemId); toast.success('Item removed'); fetchData(); }
    catch { toast.error('Failed to remove item'); }
  };
  const handleToggleUser = async (userId, isActive) => {
    try { await adminAPI.updateUserStatus(userId, { isActive: !isActive }); toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`); fetchData(); }
    catch { toast.error('Failed to update user'); }
  };

  // ── chat helpers ───────────────────────────────────────────
  const getSenderLabel = (msg, chat) => {
    if (msg.isBot) return '🤖 Donateo Assistant';
    if (!msg.sender) return 'Unknown';
    const sid = msg.sender._id || msg.sender;
    if (sid === (chat.donor._id || chat.donor)) return `Donor (${chat.donor.name})`;
    if (sid === (chat.receiver._id || chat.receiver)) return `Receiver (${chat.receiver.name})`;
    return msg.sender.name || 'User';
  };
  const getSenderClass = (msg, chat) => {
    if (msg.isBot) return 'admin-msg-bot';
    const sid = msg.sender?._id || msg.sender;
    if (sid === (chat.donor._id || chat.donor)) return 'admin-msg-donor';
    if (sid === (chat.receiver._id || chat.receiver)) return 'admin-msg-receiver';
    return 'admin-msg-user';
  };

  const openChat = (chat) => { setSelectedChat(chat._id); setSelectedItemName(chat.item.itemName); setShowChat(true); };
  const selectedChatData = chats.find(c => c._id === selectedChat);
  const reportedChats = chats.filter(c => c.reported);
  const validChats    = chats.filter(c => c.item && c.donor && c.receiver);

  // ── Analytics data ─────────────────────────────────────────
  const categoryData = Object.entries(
    allItems.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const statusData = [
    { name: 'Available',  value: allItems.filter(i => i.status === 'available').length },
    { name: 'Requested',  value: allItems.filter(i => i.status === 'requested').length },
    { name: 'Donated',    value: allItems.filter(i => i.status === 'donated').length },
    { name: 'Pending',    value: allItems.filter(i => i.status === 'pending').length },
  ].filter(d => d.value > 0);

  // Monthly trend (last 6 months)
  const monthlyTrend = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short' });
      const y = d.getFullYear(), m = d.getMonth();
      const donated = allItems.filter(it => { const cd = new Date(it.createdAt); return cd.getFullYear() === y && cd.getMonth() === m && it.status === 'donated'; }).length;
      const posted  = allItems.filter(it => { const cd = new Date(it.createdAt); return cd.getFullYear() === y && cd.getMonth() === m; }).length;
      months.push({ month: label, donated, posted });
    }
    return months;
  })();

  // ── Leaderboard ────────────────────────────────────────────
  const leaderboard = (() => {
    const map = {};
    allItems.filter(i => i.status === 'donated' && i.donor).forEach(i => {
      const id = i.donor._id || i.donor;
      const name = i.donor.name || 'Unknown';
      if (!map[id]) map[id] = { name, donated: 0, total: 0 };
      map[id].donated++;
    });
    allItems.filter(i => i.donor).forEach(i => {
      const id = i.donor._id || i.donor;
      if (map[id]) map[id].total++;
    });
    return Object.values(map).sort((a, b) => b.donated - a.donated).slice(0, 10);
  })();

  // ── CSV exports ─────────────────────────────────────────────
  const exportUsers = () => {
    downloadCSV('donateo_users.csv', users, ['name', 'email', 'phone', 'role', 'isActive']);
    toast.success('Users CSV downloaded!');
  };
  const exportItems = () => {
    const rows = allItems.map(i => ({
      itemName: i.itemName, category: i.category, status: i.status,
      donor: i.donor?.name || '', city: i.location?.city || '',
      createdAt: new Date(i.createdAt).toLocaleDateString()
    }));
    downloadCSV('donateo_items.csv', rows, ['itemName','category','status','donor','city','createdAt']);
    toast.success('Items CSV downloaded!');
  };

  // ── Chat card ──────────────────────────────────────────────
  const ChatCard = ({ chat, isReported }) => (
    <div className={`chat-item card ${isReported ? 'chat-item-reported' : ''}`}>
      <div className="chat-item-info">
        <div className="chat-item-header">
          <h4>{chat.item.itemName}</h4>
          {chat.reported && <span className="report-badge"><FiAlertTriangle /> Reported</span>}
          {chat.status === 'completed' && <span className="closed-badge">Closed</span>}
        </div>
        <p>👤 Donor: <strong>{chat.donor.name}</strong> ({chat.donor.phone || 'N/A'})</p>
        <p>👤 Receiver: <strong>{chat.receiver.name}</strong> ({chat.receiver.phone || 'N/A'})</p>
        <p>💬 Messages: {chat.messages?.length || 0}</p>
        {isReported && chat.reportReason && (
          <div className="report-reason"><FiAlertTriangle /><span><strong>Reason:</strong> {chat.reportReason}</span></div>
        )}
        {isReported && chat.reportedAt && (
          <p className="report-date">🕐 {new Date(chat.reportedAt).toLocaleString()}</p>
        )}
      </div>
      <button onClick={() => openChat(chat)} className={`btn ${isReported ? 'btn-danger' : 'btn-primary'}`}>
        {isReported ? '⚠️ Review Chat' : 'View Chat'}
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  return (
    <div className="admin-page">
      <div className="container">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
          <p>Manage users, items, and monitor platform activity</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card card">
              <div className="stat-icon"><FiUsers /></div>
              <div className="stat-content"><h3>{stats.users.total}</h3><p>Total Users</p><small>{stats.users.donors} donors • {stats.users.receivers} receivers</small></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon"><FiPackage /></div>
              <div className="stat-content"><h3>{stats.items.total}</h3><p>Total Items</p><small>{stats.items.pending} pending approval</small></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon"><FiCheckCircle /></div>
              <div className="stat-content"><h3>{stats.items.donated}</h3><p>Successfully Donated</p><small>{stats.items.available} available</small></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon"><FiTrendingUp /></div>
              <div className="stat-content"><h3>{stats.items.requested}</h3><p>Active Requests</p></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="admin-tabs">
          <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>Pending ({items.filter(i => !i.isApproved).length})</button>
          <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Items</button>
          <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users ({users.length})</button>
          <button className={`tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>Chats</button>
          <button className={`tab tab-reports ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            <FiAlertTriangle /> Reports {reportedChats.length > 0 && <span className="report-count-badge">{reportedChats.length}</span>}
          </button>
          <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><FiBarChart2 /> Analytics</button>
          <button className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}><FiAward /> Leaderboard</button>
          <button className={`tab ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}><FiDownload /> Export</button>
        </div>

        {loading ? <div className="spinner"></div>

        /* ── Users ── */
        : activeTab === 'users' ? (
          <div className="users-table card">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.name}</td><td>{user.email}</td><td>{user.phone || '—'}</td>
                    <td><span className="role-badge">{user.role}</span></td>
                    <td><span className={`badge ${user.isActive ? 'badge-success' : 'badge-secondary'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>{user.role !== 'admin' && (<button onClick={() => handleToggleUser(user._id, user.isActive)} className={`btn btn-sm ${user.isActive ? 'btn-outline' : 'btn-primary'}`}>{user.isActive ? 'Deactivate' : 'Activate'}</button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        /* ── Chats ── */
        ) : activeTab === 'chats' ? (
          <div className="chats-list">
            {validChats.length === 0 ? <p className="no-data">No chats found.</p>
              : validChats.map(chat => <ChatCard key={chat._id} chat={chat} isReported={false} />)}
          </div>

        /* ── Reports ── */
        ) : activeTab === 'reports' ? (
          <div className="chats-list">
            <div className="reports-header">
              <FiAlertTriangle className="reports-icon" />
              <div><h3>Reported Chats</h3><p>Review these chats for policy violations</p></div>
            </div>
            {reportedChats.length === 0 ? (
              <div className="empty-state card" style={{ padding: '3rem', textAlign: 'center' }}>
                <FiCheckCircle style={{ fontSize: '3rem', color: 'var(--forest-green)', marginBottom: '1rem' }} />
                <h3>No reports</h3><p>All chats are clean.</p>
              </div>
            ) : reportedChats.filter(c => c.item && c.donor && c.receiver).map(chat => <ChatCard key={chat._id} chat={chat} isReported={true} />)}
          </div>

        /* ── Analytics ── */
        ) : activeTab === 'analytics' ? (
          <div className="analytics-section">
            <div className="analytics-grid">

              {/* Monthly trend line chart */}
              <div className="chart-card card">
                <h3>📈 Monthly Activity (Last 6 Months)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="posted" stroke="#5a9bbd" strokeWidth={2} name="Items Posted" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="donated" stroke="#2e8b57" strokeWidth={2} name="Items Donated" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Category bar chart */}
              <div className="chart-card card">
                <h3>📦 Items by Category</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Items" radius={[6, 6, 0, 0]}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status pie chart */}
              <div className="chart-card card">
                <h3>🥧 Item Status Breakdown</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Summary numbers */}
              <div className="chart-card card analytics-summary">
                <h3>📊 Quick Summary</h3>
                <div className="summary-grid">
                  {[
                    { label: 'Total Items', value: allItems.length, color: '#5a9bbd' },
                    { label: 'Donated', value: allItems.filter(i => i.status === 'donated').length, color: '#2e8b57' },
                    { label: 'Available', value: allItems.filter(i => i.status === 'available').length, color: '#f0a500' },
                    { label: 'Pending', value: allItems.filter(i => i.status === 'pending').length, color: '#e53935' },
                    { label: 'Total Users', value: users.length, color: '#8e44ad' },
                    { label: 'Donors', value: users.filter(u => u.role === 'donor').length, color: '#16a085' },
                  ].map((s, i) => (
                    <div key={i} className="summary-item" style={{ borderLeftColor: s.color }}>
                      <h4 style={{ color: s.color }}>{s.value}</h4>
                      <p>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        /* ── Leaderboard ── */
        ) : activeTab === 'leaderboard' ? (
          <div className="leaderboard-section">
            <div className="leaderboard-header card">
              <FiAward className="lb-icon" />
              <div><h3>🏆 Top Donors</h3><p>Ranked by number of successful donations</p></div>
            </div>
            <div className="leaderboard-list">
              {leaderboard.length === 0 ? <p className="no-data">No donation data yet.</p> : leaderboard.map((donor, idx) => (
                <div key={idx} className={`leaderboard-item card ${idx < 3 ? `rank-${idx + 1}` : ''}`}>
                  <div className="rank-badge">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>
                  <div className="donor-lb-info">
                    <h4>{donor.name}</h4>
                    <p>{donor.total} item{donor.total !== 1 ? 's' : ''} posted</p>
                  </div>
                  <div className="donated-count">
                    <span>{donor.donated}</span>
                    <small>donated</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

        /* ── Export ── */
        ) : activeTab === 'export' ? (
          <div className="export-section">
            <h3 className="export-title">📤 Export Data</h3>
            <div className="export-grid">

              <div className="export-card card">
                <FiUsers className="export-icon" />
                <h4>Users List</h4>
                <p>Download all registered users with name, email, phone, role and status.</p>
                <button onClick={exportUsers} className="btn btn-primary">
                  <FiDownload /> Download Users CSV
                </button>
              </div>

              <div className="export-card card">
                <FiPackage className="export-icon" />
                <h4>Items List</h4>
                <p>Download all items with name, category, status, donor and location.</p>
                <button onClick={exportItems} className="btn btn-primary">
                  <FiDownload /> Download Items CSV
                </button>
              </div>

              <div className="export-card card export-card-highlight">
                <FiBarChart2 className="export-icon" />
                <h4>Monthly Report</h4>
                <p>Download a summary report of items donated, received, available and remaining for this month.</p>
                <div className="monthly-preview">
                  <div className="mp-row"><span>Items Donated</span><strong>{allItems.filter(i => i.status === 'donated').length}</strong></div>
                  <div className="mp-row"><span>Items Received</span><strong>{allItems.filter(i => i.receiverConfirmed).length}</strong></div>
                  <div className="mp-row"><span>Available</span><strong>{allItems.filter(i => i.status === 'available').length}</strong></div>
                  <div className="mp-row"><span>Remaining (Pending)</span><strong>{allItems.filter(i => i.status === 'pending').length}</strong></div>
                </div>
                <button onClick={() => downloadMonthlyReport(allItems)} className="btn btn-primary">
                  <FiDownload /> Download Monthly Report
                </button>
              </div>

            </div>
          </div>

        /* ── Items (pending / all) ── */
        ) : (
          <div className="items-list">
            {items.map(item => (
              <div key={item._id} className="item-row card">
                <ZoomableImage src={item.image} name={item.itemName} className="item-row-img" style={{ width: '110px', height: '110px', borderRadius: '10px', flexShrink: 0 }} />
                <div className="item-info">
                  <h3>{item.itemName}</h3>
                  <p>{item.description}</p>
                  <div className="item-meta">
                    <span className="badge badge-info">{item.category}</span>
                    <span>Donor: {item.donor?.name || 'N/A'}</span>
                    <span>Location: {item.location?.city || 'N/A'}</span>
                  </div>
                </div>
                <div className="item-actions">
                  {!item.isApproved && <button onClick={() => handleApproveItem(item._id)} className="btn btn-primary"><FiCheckCircle /> Approve</button>}
                  <button onClick={() => handleRemoveItem(item._id)} className="btn btn-outline"><FiXCircle /> Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Admin Chat Viewer Modal */}
        {showChat && selectedChat && selectedChatData && (
          <div className="chat-modal-overlay" onClick={() => setShowChat(false)}>
            <div className="admin-chat-modal card" onClick={e => e.stopPropagation()}>
              <div className="admin-chat-modal-header">
                <div>
                  <h3>Chat: {selectedItemName}</h3>
                  <p className="admin-chat-subtitle">
                    👤 Donor: <strong>{selectedChatData.donor.name}</strong> &nbsp;|&nbsp;
                    👤 Receiver: <strong>{selectedChatData.receiver.name}</strong>
                  </p>
                  {selectedChatData.reported && (
                    <div className="admin-report-banner">
                      <FiAlertTriangle />
                      <span>⚠️ Reported — Reason: <strong>{selectedChatData.reportReason || 'Not specified'}</strong></span>
                    </div>
                  )}
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setShowChat(false)}>Close</button>
              </div>
              <div className="admin-chat-messages">
                {selectedChatData.messages?.length === 0 ? <p className="no-data">No messages yet.</p> : (
                  selectedChatData.messages?.map((msg, idx) => (
                    <div key={idx} className={`admin-chat-message ${getSenderClass(msg, selectedChatData)}`}>
                      <div className="admin-msg-header">
                        <span className="admin-msg-sender">{getSenderLabel(msg, selectedChatData)}</span>
                        <span className="admin-msg-time">{new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="admin-msg-content">{msg.content || msg.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;