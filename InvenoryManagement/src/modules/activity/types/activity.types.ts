export interface UserActivity {
  id: string;
  tenantId: string;
  userId: string;
  userEmail?: string;
  actionType: string;
  module: string;
  description: string;
  metadata?: any;
  createdAt: Date;
}

export interface CreateActivityInput {
  tenantId: string;
  userId: string;
  actionType: string;
  module: string;
  description: string;
  metadata?: any;
}
