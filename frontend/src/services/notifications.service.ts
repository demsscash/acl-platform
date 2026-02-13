import api from './api';

export interface Notification {
  id: number;
  type: string;
  titre: string;
  message: string;
  userId?: number;
  targetRole?: string;
  referenceType?: string;
  referenceId?: number;
  lue: boolean;
  lueAt?: string;
  createdAt: string;
}

const notificationsService = {
  // Get notifications for current user
  getAll: async (unread = false): Promise<Notification[]> => {
    const params = unread ? { unread: 'true' } : {};
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get('/notifications/count');
    return data.count;
  },

  // Mark as read
  markAsRead: async (id: number): Promise<Notification> => {
    const { data } = await api.post(`/notifications/${id}/read`);
    return data;
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },
};

export default notificationsService;
