
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ScheduleItem {
  id: string;
  date: string;
  title: string;
}

export interface NewsItem {
  id: string;
  content: string;
  timestamp: string;
}

export interface PropertyDetail {
  id: string;
  lotNumber: string;
  usage: string;
  majorCategory: string;
  minorCategory: string;
  appraisalValue: number;
  itemLtv: number;
  seniorDeduction: number;
}

export interface RentalUnit {
  id: string;
  floor: string;
  unit: string;
  deposit: number;
  monthlyRent: number;
}

export interface LoanState {
  city: string;
  district: string;
  neighborhood: string;
  village: string; 
  properties: PropertyDetail[];
  rentals: RentalUnit[];
  interestRate: number;
  annualIncome: number;
}

export interface AdminFile {
  id: string;
  name: string;
  type: string;
  content: string;
}
