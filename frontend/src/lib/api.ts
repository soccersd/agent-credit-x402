import axios from 'axios';
import { BACKEND_API_URL } from '@/lib/constants';

const apiClient = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Agent status types
export interface CreditScore {
  score: number;
  max_score: number;
  grade: string;
  on_chain_history_score: number;
  portfolio_value_score: number;
  repayment_history_score: number;
  reputation_score: number;
  identity_bonus: number;
  risk_adjustment: number;
  calculated_at: string;
  wallet_address: string;
  max_borrow_limit: number;
}

export interface AgentWallet {
  balance_usdc: number;
  total_earned: number;
  total_spent_on_repayments: number;
  tasks_completed: number;
  tasks_failed: number;
  success_rate: number;
  last_earning_at: string | null;
}

export interface ActiveLoan {
  loan_id: string;
  wallet_address: string;
  principal: number;
  outstanding: number;
  interest_rate: number;
  collateral_amount: number;
  collateral_token: string;
  status: string;
  created_at: string;
  due_at: string;
  repaid_amount: number;
  stream_rate_per_sec: number;
}

export interface CollateralReport {
  total_value_usd: number;
  positions_count: number;
  healthy_positions: number;
  unhealthy_positions: string[];
  recommendations: any[];
  overall_health: number;
  timestamp: string;
}

export interface AgentStatus {
  current_state: string;
  is_running: boolean;
  credit_score: CreditScore | null;
  wallet: AgentWallet | null;
  active_loans_count: number;
  active_loans: ActiveLoan[];
  collateral_report: CollateralReport | null;
  iteration_count: number;
  last_updated: string;
  error_message: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  timestamp: string;
}

// API functions
export async function getAgentStatus(): Promise<ApiResponse<AgentStatus>> {
  const response = await apiClient.get<ApiResponse<AgentStatus>>('/api/status');
  return response.data;
}

export async function triggerAgentLoop(): Promise<ApiResponse<string>> {
  const response = await apiClient.post<ApiResponse<string>>('/api/trigger_loop', { force: true });
  return response.data;
}

export async function startAgent(): Promise<ApiResponse<string>> {
  const response = await apiClient.post<ApiResponse<string>>('/api/start');
  return response.data;
}

export async function stopAgent(): Promise<ApiResponse<string>> {
  const response = await apiClient.post<ApiResponse<string>>('/api/stop');
  return response.data;
}

export async function createLoan(amount: number, collateralToken: string, durationSecs: number): Promise<ApiResponse<string>> {
  const response = await apiClient.post<ApiResponse<string>>('/api/loans', {
    amount,
    collateral_token: collateralToken,
    duration_secs: durationSecs,
  });
  return response.data;
}

export async function repayLoan(loanId: string): Promise<ApiResponse<string>> {
  const response = await apiClient.post<ApiResponse<string>>(`/api/loans/${loanId}/repay`);
  return response.data;
}

export async function cancelLoan(loanId: string): Promise<ApiResponse<string>> {
  const response = await apiClient.post<ApiResponse<string>>(`/api/loans/${loanId}/cancel`);
  return response.data;
}

export async function getActiveLoans(): Promise<ApiResponse<ActiveLoan[]>> {
  const response = await apiClient.get<ApiResponse<ActiveLoan[]>>('/api/loans');
  return response.data;
}

export async function getCollateralReport(): Promise<ApiResponse<CollateralReport | null>> {
  const response = await apiClient.get<ApiResponse<CollateralReport | null>>('/api/collateral');
  return response.data;
}

export async function checkHealth(): Promise<ApiResponse<string>> {
  const response = await apiClient.get<ApiResponse<string>>('/api/health');
  return response.data;
}

export default apiClient;
