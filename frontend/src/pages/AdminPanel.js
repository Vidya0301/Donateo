import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI, chatAPI, announcementAPI, categoryAPI, supportAPI, ratingAPI, appReviewAPI, itemsAPI } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiUsers, FiPackage, FiCheckCircle, FiXCircle, FiTrendingUp,
  FiAlertTriangle, FiDownload, FiBarChart2, FiAward, FiBell, FiTag, FiMail, FiStar
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
  const [announcements, setAnnouncements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportUnread, setSupportUnread]     = useState(0);
  const [allRatings, setAllRatings]           = useState([]);
  const [expandedRating, setExpandedRating]   = useState(null);
  const [appReviews, setAppReviews]           = useState({ reviews: [], total: 0, average: null, distribution: {} });
  const [replyText, setReplyText]             = useState({});
  const [expandedMsg, setExpandedMsg]         = useState(null);
  const [newCategory, setNewCategory] = useState({ label: '', icon: '✨' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info', expiresAt: '' });
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
      if (activeTab === 'announcements') promises.push(announcementAPI.getAll());
      if (activeTab === 'categories') promises.push(categoryAPI.getAll());
      if (activeTab === 'support') promises.push(supportAPI.getAll());
      if (activeTab === 'ratings') promises.push(ratingAPI.getAll());
      if (activeTab === 'appreviews') promises.push(appReviewAPI.getAll());
      if (activeTab === 'analytics' || activeTab === 'leaderboard' || activeTab === 'export' || activeTab === 'monthly')
        promises.push(adminAPI.getItems({})); // all items for analytics

      const results = await Promise.all(promises);
      setStats(results[0].data);
      setUsers(results[1].data);
      setItems(results[2].data);
      if ((activeTab === 'chats' || activeTab === 'reports') && results[3]) setChats(results[3].data);
      if (['analytics','leaderboard','export','monthly'].includes(activeTab) && results[3]) setAllItems(results[3].data);
      if (activeTab === 'announcements' && results[3]) setAnnouncements(results[3].data);
      if (activeTab === 'categories' && results[3]) setCategories(results[3].data);
      if (activeTab === 'support' && results[3]) setSupportMessages(results[3].data);
      if (activeTab === 'ratings' && results[3]) setAllRatings(results[3].data);
      if (activeTab === 'appreviews' && results[3]) setAppReviews(results[3].data);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Fetch unread support count on mount
  useEffect(() => {
    supportAPI.getUnreadCount().then(r => setSupportUnread(r.data.count)).catch(() => {});
  }, []);

  const handleMarkRead = async (id) => {
    try { await supportAPI.markAsRead(id); setSupportMessages(m => m.map(x => x._id === id ? { ...x, status: 'read' } : x)); setSupportUnread(n => Math.max(0, n - 1)); } catch {}
  };

  const handleReply = async (id) => {
    const reply = replyText[id];
    if (!reply?.trim()) { toast.error('Reply cannot be empty'); return; }
    try {
      await supportAPI.reply(id, reply);
      setSupportMessages(m => m.map(x => x._id === id ? { ...x, adminReply: reply, status: 'resolved' } : x));
      setReplyText(t => ({ ...t, [id]: '' }));
      toast.success('Reply sent!');
    } catch { toast.error('Failed to send reply'); }
  };

  const handleResolve = async (id) => {
    try { await supportAPI.resolve(id); setSupportMessages(m => m.map(x => x._id === id ? { ...x, status: 'resolved' } : x)); toast.success('Marked as resolved'); } catch {}
  };

  const handleDeleteMsg = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try { await supportAPI.remove(id); setSupportMessages(m => m.filter(x => x._id !== id)); toast.success('Deleted'); } catch {}
  };

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

  // ── category handlers ──
  const handleCreateCategory = async () => {
    if (!newCategory.label) { toast.error('Label is required'); return; }
    try {
      await categoryAPI.create(newCategory);
      toast.success('Category created!');
      setNewCategory({ label: '', icon: '✨' });
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to create'); }
  };

  const handleUpdateCategory = async (id) => {
    try {
      await categoryAPI.update(id, editingCategory);
      toast.success('Category updated!');
      setEditingCategory(null);
      fetchData();
    } catch { toast.error('Failed to update'); }
  };

  const handleToggleCategory = async (id) => {
    try { await categoryAPI.toggle(id); fetchData(); }
    catch { toast.error('Failed to toggle'); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Items using it will keep the old value.')) return;
    try { await categoryAPI.remove(id); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
  };

  // ── announcement handlers ──
  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.message) {
      toast.error('Title and message are required'); return;
    }
    try {
      await announcementAPI.create(newAnnouncement);
      toast.success('Announcement created!');
      setNewAnnouncement({ title: '', message: '', type: 'info', expiresAt: '' });
      fetchData();
    } catch { toast.error('Failed to create announcement'); }
  };

  const handleToggleAnnouncement = async (id) => {
    try { await announcementAPI.toggle(id); fetchData(); }
    catch { toast.error('Failed to toggle announcement'); }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try { await announcementAPI.remove(id); toast.success('Deleted'); fetchData(); }
    catch { toast.error('Failed to delete'); }
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
          <button className={`tab ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}><FiBell /> Announcements</button>
          <button className={`tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}><FiTag /> Categories</button>
          <button className={`tab tab-support ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>
            <FiMail /> Support {supportUnread > 0 && <span className="tab-badge">{supportUnread}</span>}
          </button>
          <button className={`tab ${activeTab === 'ratings' ? 'active' : ''}`} onClick={() => setActiveTab('ratings')}>
            <FiStar /> Ratings
          </button>
          <button className={`tab ${activeTab === 'appreviews' ? 'active' : ''}`} onClick={() => setActiveTab('appreviews')}>
            <FiStar /> App Reviews
          </button>
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

        /* ── Categories ── */
        ) : activeTab === 'categories' ? (
          <div className="categories-section">

            {/* Create new category */}
            <div className="category-form card">
              <h3>🗂️ Add New Category</h3>
              <div className="cat-form-row">
                <div className="cat-field">
                  <label>Icon (emoji)</label>
                  <input
                    type="text"
                    placeholder="e.g. 🎮"
                    value={newCategory.icon}
                    maxLength={4}
                    onChange={e => setNewCategory(p => ({ ...p, icon: e.target.value }))}
                  />
                </div>
                <div className="cat-field cat-field-grow">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Electronics"
                    value={newCategory.label}
                    onChange={e => setNewCategory(p => ({ ...p, label: e.target.value }))}
                  />
                </div>
                <button onClick={handleCreateCategory} className="btn btn-primary cat-add-btn">
                  + Add Category
                </button>
              </div>
            </div>

            {/* Categories list */}
            <h3 className="cat-list-title">All Categories ({categories.length})</h3>
            <div className="cat-list">
              {categories.map(cat => (
                <div key={cat._id} className={`cat-item card ${!cat.isActive ? 'cat-inactive' : ''}`}>
                  {editingCategory?._id === cat._id ? (
                    /* Edit mode */
                    <div className="cat-edit-row">
                      <input
                        className="cat-edit-icon"
                        value={editingCategory.icon}
                        maxLength={4}
                        onChange={e => setEditingCategory(p => ({ ...p, icon: e.target.value }))}
                      />
                      <input
                        className="cat-edit-label"
                        value={editingCategory.label}
                        onChange={e => setEditingCategory(p => ({ ...p, label: e.target.value }))}
                      />
                      <button onClick={() => handleUpdateCategory(cat._id)} className="btn btn-sm btn-primary">Save</button>
                      <button onClick={() => setEditingCategory(null)} className="btn btn-sm btn-outline">Cancel</button>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="cat-view-row">
                      <span className="cat-icon">{cat.icon}</span>
                      <span className="cat-label">{cat.label}</span>
                      <span className="cat-value-tag">{cat.value}</span>
                      <span className={`cat-status ${cat.isActive ? 'cat-active' : 'cat-disabled'}`}>
                        {cat.isActive ? 'Active' : 'Disabled'}
                      </span>
                      <div className="cat-actions">
                        <button onClick={() => setEditingCategory({ _id: cat._id, label: cat.label, icon: cat.icon })} className="btn btn-sm btn-outline">✏️ Edit</button>
                        <button onClick={() => handleToggleCategory(cat._id)} className={`btn btn-sm ${cat.isActive ? 'btn-outline' : 'btn-primary'}`}>
                          {cat.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => handleDeleteCategory(cat._id)} className="btn btn-sm btn-danger">🗑️ Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="cat-note">⚠️ Disabled categories won't appear in the Donate or Browse dropdowns. Deleting a category won't affect existing items.</p>
          </div>

        /* ── Announcements ── */
        ) : activeTab === 'announcements' ? (
          <div className="announcements-section">

            {/* Create form */}
            <div className="announcement-form card">
              <h3>📣 Create New Announcement</h3>
              <div className="ann-form-grid">
                <div className="ann-field">
                  <label>Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Platform Maintenance"
                    value={newAnnouncement.title}
                    maxLength={100}
                    onChange={e => setNewAnnouncement(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="ann-field ann-field-type">
                  <label>Type</label>
                  <select value={newAnnouncement.type} onChange={e => setNewAnnouncement(p => ({ ...p, type: e.target.value }))}>
                    <option value="info">ℹ️ Info</option>
                    <option value="warning">⚠️ Warning</option>
                    <option value="maintenance">🔧 Maintenance</option>
                    <option value="success">✅ Success</option>
                  </select>
                </div>
                <div className="ann-field ann-field-full">
                  <label>Message *</label>
                  <textarea
                    placeholder="Write your announcement message..."
                    value={newAnnouncement.message}
                    maxLength={500}
                    rows={3}
                    onChange={e => setNewAnnouncement(p => ({ ...p, message: e.target.value }))}
                  />
                  <small>{newAnnouncement.message.length}/500</small>
                </div>
                <div className="ann-field ann-field-full">
                  <label>Expires At (optional)</label>
                  <div className="ann-expires-row">
                    <input
                      type="date"
                      value={newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[0] : ''}
                      onChange={e => {
                        const timePart = newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[1] : '09:00 AM';
                        setNewAnnouncement(p => ({ ...p, expiresAt: e.target.value ? `${e.target.value}T${timePart}` : '' }));
                      }}
                      className="ann-date-input"
                    />
                    <select
                      value={newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[1]?.split(':')[0] || '09' : '09'}
                      onChange={e => {
                        const date = newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[0] : '';
                        const mins = newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[1]?.split(':')[1]?.split(' ')[0] || '00' : '00';
                        const ampm = newAnnouncement.expiresAt?.includes('PM') ? 'PM' : 'AM';
                        if (date) setNewAnnouncement(p => ({ ...p, expiresAt: `${date}T${e.target.value}:${mins} ${ampm}` }));
                      }}
                      className="ann-time-select"
                    >
                      {Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map(h=>(
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="time-sep">:</span>
                    <select
                      value={newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[1]?.split(':')[1]?.split(' ')[0] || '00' : '00'}
                      onChange={e => {
                        const date = newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[0] : '';
                        const hrs = newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[1]?.split(':')[0] || '09' : '09';
                        const ampm = newAnnouncement.expiresAt?.includes('PM') ? 'PM' : 'AM';
                        if (date) setNewAnnouncement(p => ({ ...p, expiresAt: `${date}T${hrs}:${e.target.value} ${ampm}` }));
                      }}
                      className="ann-time-select"
                    >
                      {['00','15','30','45'].map(m=>(
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={newAnnouncement.expiresAt?.includes('PM') ? 'PM' : 'AM'}
                      onChange={e => {
                        const date = newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[0] : '';
                        const hrs = newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[1]?.split(':')[0] || '09' : '09';
                        const mins = newAnnouncement.expiresAt ? newAnnouncement.expiresAt.split('T')[1]?.split(':')[1]?.split(' ')[0] || '00' : '00';
                        if (date) setNewAnnouncement(p => ({ ...p, expiresAt: `${date}T${hrs}:${mins} ${e.target.value}` }));
                      }}
                      className="ann-time-select ann-ampm-select"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={handleCreateAnnouncement} className="btn btn-primary ann-submit">
                <FiBell /> Publish Announcement
              </button>
            </div>

            {/* Existing announcements */}
            <h3 className="ann-list-title">All Announcements ({announcements.length})</h3>
            {announcements.length === 0 ? (
              <div className="empty-state card" style={{ padding: '2rem', textAlign: 'center' }}>
                <FiBell style={{ fontSize: '2.5rem', color: '#ccc', marginBottom: '0.75rem' }} />
                <p>No announcements yet. Create one above.</p>
              </div>
            ) : (
              <div className="ann-list">
                {announcements.map(a => {
                  const typeIcons = { info: 'ℹ️', warning: '⚠️', maintenance: '🔧', success: '✅' };
                  const isExpired = a.expiresAt && new Date(a.expiresAt) < new Date();
                  return (
                    <div key={a._id} className={`ann-item card ${!a.isActive ? 'ann-inactive' : ''} ann-type-${a.type}`}>
                      <div className="ann-item-left">
                        <span className="ann-type-icon">{typeIcons[a.type] || 'ℹ️'}</span>
                        <div className="ann-item-body">
                          <div className="ann-item-header">
                            <h4>{a.title}</h4>
                            <span className={`ann-status-badge ${a.isActive && !isExpired ? 'badge-success' : 'badge-secondary'}`}>
                              {isExpired ? 'Expired' : a.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p>{a.message}</p>
                          <div className="ann-item-meta">
                            <small>Created: {new Date(a.createdAt).toLocaleDateString()}</small>
                            {a.expiresAt && <small>Expires: {new Date(a.expiresAt).toLocaleString()}</small>}
                          </div>
                        </div>
                      </div>
                      <div className="ann-item-actions">
                        <button onClick={() => handleToggleAnnouncement(a._id)} className={`btn btn-sm ${a.isActive ? 'btn-outline' : 'btn-primary'}`}>
                          {a.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDeleteAnnouncement(a._id)} className="btn btn-sm btn-danger">
                          <FiXCircle /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        ) : activeTab === 'appreviews' ? (
          <div className="app-reviews-admin">
            <h3 className="support-inbox-title"><FiStar /> App Reviews</h3>

            {/* Summary bar */}
            {appReviews.total > 0 && (
              <div className="app-reviews-summary card">
                <div className="app-reviews-avg-block">
                  <span className="app-reviews-avg-num">{appReviews.average}</span>
                  <div>
                    <div className="admin-stars" style={{ fontSize: '1.4rem' }}>
                      {'★'.repeat(Math.round(appReviews.average))}{'☆'.repeat(5 - Math.round(appReviews.average))}
                    </div>
                    <p style={{ color: '#888', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>{appReviews.total} review{appReviews.total !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="app-reviews-dist">
                  {[5,4,3,2,1].map(n => (
                    <div key={n} className="dist-row">
                      <span className="dist-label">{n}★</span>
                      <div className="dist-bar-wrap">
                        <div className="dist-bar" style={{ width: appReviews.total > 0 ? `${((appReviews.distribution[n] || 0) / appReviews.total) * 100}%` : '0%' }} />
                      </div>
                      <span className="dist-count">{appReviews.distribution[n] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {appReviews.total === 0 ? (
              <div className="empty-state card"><FiStar /><h3>No app reviews yet</h3></div>
            ) : (
              <div className="app-reviews-list">
                {appReviews.reviews.map(r => (
                  <div key={r._id} className="app-review-card card">
                    <div className="app-review-card-top">
                      <div className="rating-avatar-sm" style={{ background: 'linear-gradient(135deg, #2e8b57, #52a878)' }}>
                        {r.user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, margin: 0 }}>{r.user?.name}</p>
                        <p style={{ fontSize: '0.8rem', color: '#888', margin: 0 }}>{r.user?.email}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="admin-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                        <span style={{ fontSize: '0.78rem', color: '#aaa' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ marginLeft: '1rem' }}
                        onClick={async () => {
                          if (!window.confirm('Delete this review?')) return;
                          try {
                            await appReviewAPI.remove(r._id);
                            setAppReviews(prev => ({
                              ...prev,
                              reviews: prev.reviews.filter(x => x._id !== r._id),
                              total: prev.total - 1
                            }));
                            toast.success('Review deleted');
                          } catch { toast.error('Failed to delete'); }
                        }}
                      >Delete</button>
                    </div>
                    {r.review && (
                      <p style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f0f0f0', fontStyle: 'italic', color: '#555', fontSize: '0.9rem' }}>
                        &ldquo;{r.review}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : activeTab === 'ratings' ? (
          <div className="ratings-admin-section">
            <h3 className="support-inbox-title"><FiStar /> All Ratings & Reviews</h3>
            {allRatings.length === 0 ? (
              <div className="empty-state card"><FiStar /><h3>No ratings yet</h3></div>
            ) : (
              <div className="ratings-cards-list">
                {allRatings.map(r => {
                  const isExpanded = expandedRating === r._id;
                  const ea = r.extraAnswers || {};
                  const DONOR_LABELS = [
                    { key: 'communication',     q: 'Communication' },
                    { key: 'punctuality',        q: 'Punctuality' },
                    { key: 'carefulness',        q: 'Item Care' },
                    { key: 'wouldRecommend',     q: 'Suggest to Friends?' },
                    { key: 'wouldDonateAgain',   q: 'Donate More Items?' },
                    { key: 'overallExperience',  q: 'Overall Experience' },
                  ];
                  const RECEIVER_LABELS = [
                    { key: 'itemConditionMatch', q: 'Item as Described?' },
                    { key: 'communication',      q: 'Communication' },
                    { key: 'punctuality',        q: 'Punctuality' },
                    { key: 'wouldRecommend',     q: 'Suggest to Friends?' },
                    { key: 'wouldReceiveAgain',  q: 'Receive More Items?' },
                    { key: 'overallExperience',  q: 'Overall Experience' },
                  ];
                  const OPTS_MAP = {
                    communication:     ['Poor', 'Average', 'Good', 'Excellent'],
                    punctuality:       ['Late', 'Slightly late', 'On time', 'Early'],
                    carefulness:       ['Not careful', 'Somewhat', 'Careful', 'Very careful'],
                    wouldRecommend:    ['No', 'Maybe', 'Yes', 'Absolutely!'],
                    wouldDonateAgain:  ['No', 'Maybe', 'Yes', 'Definitely!'],
                    wouldReceiveAgain: ['No', 'Maybe', 'Yes', 'Definitely!'],
                    itemConditionMatch:['Not at all', 'Somewhat', 'Mostly', 'Perfectly'],
                    overallExperience: ['Bad', 'Okay', 'Good', 'Amazing!'],
                  };
                  const LABELS_TO_USE = r.role === 'receiver_rates_donor' ? RECEIVER_LABELS : DONOR_LABELS;
                  return (
                    <div key={r._id} className="rating-admin-card card">
                      <div className="rating-admin-card-header" onClick={() => setExpandedRating(isExpanded ? null : r._id)}>
                        <div className="rating-admin-card-left">
                          <span className={`role-badge ${r.role === 'receiver_rates_donor' ? 'badge-info' : 'badge-success'}`}>
                            {r.role === 'receiver_rates_donor' ? 'Receiver → Donor' : 'Donor → Receiver'}
                          </span>
                          <span className="rating-admin-item">{r.item?.itemName || '—'}</span>
                        </div>
                        <div className="rating-admin-card-mid">
                          <span className="rating-admin-names">{r.reviewer?.name} → {r.reviewee?.name}</span>
                          <span className="admin-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} {r.rating}/5</span>
                        </div>
                        <div className="rating-admin-card-right">
                          <span className="rating-admin-date">{new Date(r.createdAt).toLocaleDateString()}</span>
                          <span className="rating-expand-btn">{isExpanded ? '▲ Hide' : '▼ Details'}</span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="rating-admin-details">
                          {r.review && (
                            <div className="rating-admin-review">
                              <strong>Review:</strong> "{r.review}"
                            </div>
                          )}
                          <div className="rating-extra-answers">
                            {LABELS_TO_USE.map(({ key, q }) => (
                              ea[key] !== undefined && ea[key] !== null ? (
                                <div key={key} className="extra-answer-row">
                                  <span className="extra-answer-q">{q}</span>
                                  <span className="extra-answer-v">{OPTS_MAP[key]?.[ea[key]] || ea[key]}</span>
                                </div>
                              ) : null
                            ))}
                          </div>
                          <button className="btn btn-sm btn-danger" style={{marginTop:'0.75rem'}}
                            onClick={async () => {
                              if (!window.confirm('Delete this rating?')) return;
                              try { await ratingAPI.remove(r._id); setAllRatings(prev => prev.filter(x => x._id !== r._id)); toast.success('Deleted'); }
                              catch { toast.error('Failed'); }
                            }}>Delete</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        ) : activeTab === 'support' ? (
          <div className="support-inbox">
            <h3 className="support-inbox-title">
              <FiMail /> Support Inbox
              {supportUnread > 0 && <span className="support-unread-badge">{supportUnread} unread</span>}
            </h3>
            {supportMessages.length === 0 ? (
              <div className="empty-state card" style={{ padding: '2rem', textAlign: 'center' }}>
                <FiMail style={{ fontSize: '2.5rem', color: '#ccc', marginBottom: '0.75rem' }} />
                <p>No support messages yet.</p>
              </div>
            ) : (
              <div className="support-list">
                {supportMessages.map(msg => (
                  <div key={msg._id} className={`support-card card ${msg.status === 'unread' ? 'support-unread' : ''} ${msg.status === 'resolved' ? 'support-resolved' : ''}`}>
                    <div className="support-card-header" onClick={() => { setExpandedMsg(expandedMsg === msg._id ? null : msg._id); if (msg.status === 'unread') handleMarkRead(msg._id); }}>
                      <div className="support-card-left">
                        <div className="support-sender">
                          <span className="support-name">{msg.name}</span>
                          <span className="support-email">{msg.email}</span>
                          {msg.userId && <span className="support-registered">✅ Registered User</span>}
                        </div>
                        <div className="support-subject">{msg.subject}</div>
                      </div>
                      <div className="support-card-right">
                        <span className={`support-status-badge ${msg.status === 'unread' ? 'badge-danger' : msg.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>
                          {msg.status === 'unread' ? '🔴 Unread' : msg.status === 'resolved' ? '✅ Resolved' : '👁 Read'}
                        </span>
                        <span className="support-date">{new Date(msg.createdAt).toLocaleDateString()}</span>
                        <button className="btn btn-sm btn-danger support-delete" onClick={e => { e.stopPropagation(); handleDeleteMsg(msg._id); }}>
                          <FiXCircle />
                        </button>
                      </div>
                    </div>
                    {expandedMsg === msg._id && (
                      <div className="support-card-body">
                        <div className="support-message-text">
                          <strong>Message:</strong>
                          <p>{msg.message}</p>
                        </div>
                        {msg.adminReply && (
                          <div className="support-reply-sent">
                            <strong>✉️ Your Reply:</strong>
                            <p>{msg.adminReply}</p>
                            <small>Replied: {new Date(msg.repliedAt).toLocaleString()}</small>
                          </div>
                        )}
                        {msg.status !== 'resolved' && (
                          <div className="support-reply-form">
                            <textarea
                              value={replyText[msg._id] || ''}
                              onChange={e => setReplyText(t => ({ ...t, [msg._id]: e.target.value }))}
                              placeholder="Type your reply..."
                              className="form-control"
                              rows="3"
                            />
                            <div className="support-reply-actions">
                              <button onClick={() => handleReply(msg._id)} className="btn btn-primary btn-sm">
                                <FiMail /> Send Reply
                              </button>
                              <button onClick={() => handleResolve(msg._id)} className="btn btn-outline btn-sm">
                                <FiCheckCircle /> Mark Resolved
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        /* ── Items (pending / all) ── */
        ) : (
          <div className="items-list">
            {activeTab === 'all' && (
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
                <button className="btn btn-sm btn-outline" style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}
                  onClick={async () => {
                    if (!window.confirm('Geocode all items missing GPS? This may take a minute (1 req/sec per item).')) return;
                    try {
                      const res = await itemsAPI.geocodeItems();
                      toast.success(res.data.message);
                    } catch { toast.error('Geocoding failed'); }
                  }}>
                  📍 Fix Missing GPS Coords
                </button>
              </div>
            )}
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