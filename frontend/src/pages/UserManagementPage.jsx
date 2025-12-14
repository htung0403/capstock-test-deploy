import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { useToast } from '../components/Toast';

const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const { show } = useToast();
  const isDark = theme === 'dark';
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All'); // All | Writers | Editors | Banned
  const [editingRoles, setEditingRoles] = useState({}); // { userId: { WRITER: bool, EDITOR: bool } }

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load users';
      setError(errorMessage);
      show(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (userId, role, checked) => {
    try {
      const user = users.find(u => u._id === userId);
      if (!user) return;

      const currentRoles = user.roles || (user.role ? [user.role] : ['USER']);
      let newRoles;

      if (checked) {
        // Add role
        newRoles = [...new Set([...currentRoles, role])];
      } else {
        // Remove role (but keep USER)
        newRoles = currentRoles.filter(r => r !== role);
        if (newRoles.length === 0 || !newRoles.includes('USER')) {
          newRoles = ['USER'];
        }
      }

      // Don't allow removing ADMIN from yourself
      if (userId === currentUser?.id && role === 'ADMIN' && !checked) {
        show('Cannot remove ADMIN role from yourself', 'error');
        return;
      }

      await api.patch(`/admin/users/${userId}/roles`, { roles: newRoles });
      show(`User roles updated successfully`, 'success');
      fetchUsers(); // Refresh list
    } catch (err) {
      show(err.response?.data?.message || 'Failed to update roles', 'error');
    }
  };

  const handleBanToggle = async (userId, isBanned) => {
    if (!window.confirm(`Are you sure you want to ${isBanned ? 'ban' : 'unban'} this user?`)) {
      return;
    }

    try {
      // Prevent banning yourself
      if (userId === currentUser?.id) {
        show('Cannot ban yourself', 'error');
        return;
      }

      await api.patch(`/admin/users/${userId}/ban`, { isBanned });
      show(`User ${isBanned ? 'banned' : 'unbanned'} successfully`, 'success');
      fetchUsers(); // Refresh list
    } catch (err) {
      show(err.response?.data?.message || 'Failed to update ban status', 'error');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'WRITER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'EDITOR': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ADMIN': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'All') return true;
    if (filter === 'Banned') return user.isBanned === true;
    if (filter === 'Writers') {
      const roles = user.roles || (user.role ? [user.role] : []);
      return roles.includes('WRITER');
    }
    if (filter === 'Editors') {
      const roles = user.roles || (user.role ? [user.role] : []);
      return roles.includes('EDITOR');
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          User Management
        </h1>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Manage user roles and ban status
        </p>
      </div>

      {/* Filters */}
      <div className={`mb-6 p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</label>
          <div className="flex gap-2">
            {['All', 'Writers', 'Editors', 'Banned'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className={`rounded-lg shadow-md overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-100'}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userRoles = user.roles || (user.role ? [user.role] : ['USER']);
                  const isAdmin = userRoles.includes('ADMIN');
                  const isCurrentUser = user._id === currentUser?.id;

                  return (
                    <tr
                      key={user._id}
                      className={`hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.username || user.full_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          {/* Role Badges */}
                          {userRoles.map((role) => (
                            <span
                              key={role}
                              className={`px-2 py-1 text-xs font-semibold rounded ${getRoleBadgeColor(role)}`}
                            >
                              {role}
                            </span>
                          ))}
                          
                          {/* Role Checkboxes (only for non-ADMIN roles) */}
                          {!isAdmin && (
                            <div className="flex gap-4 ml-2">
                              <label className="flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userRoles.includes('WRITER')}
                                  onChange={(e) => handleRoleToggle(user._id, 'WRITER', e.target.checked)}
                                  className="w-4 h-4"
                                />
                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>WRITER</span>
                              </label>
                              <label className="flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userRoles.includes('EDITOR')}
                                  onChange={(e) => handleRoleToggle(user._id, 'EDITOR', e.target.checked)}
                                  className="w-4 h-4"
                                />
                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>EDITOR</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isBanned ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Banned
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleBanToggle(user._id, !user.isBanned)}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                              user.isBanned
                                ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
                                : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                            }`}
                          >
                            {user.isBanned ? 'Unban' : 'Ban'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;

