export interface Survey {
  id: number;
  surveyId: string;
  name: string;
  description: string | null;
  createdDate: string;
  updatedAt: string;
  sections?: SurveySection[];
}

export interface SurveySection {
  id: number;
  surveyId: number;
  sectionId: string;
  name: string;
  riskLevel: string | null;
  sortOrder: number;
  questions?: SurveyQuestion[];
  _count?: {
    questions: number;
  };
}

export interface SurveyQuestion {
  id: number;
  sectionId: number;
  questionId: string;
  questionText: string;
  helpText: string | null;
  answerType: 'single-choice' | 'multiple-choice' | 'text';
  options: string | null; // JSON string
  sortOrder: number;
  likelihood: number | null;
  overallImpact: number | null;
  answers?: SurveyAnswer[];
}

export interface SurveyAnswer {
  id: number;
  questionId: number;
  selectedOption: string | null;
  comments: string | null;
  answeredBy: string | null;
  answeredDate: string | null;
  createdAt: string;
}

export interface SurveyListItem {
  id: number;
  surveyId: string;
  name: string;
  description: string | null;
  createdDate: string;
  sectionCount: number;
  questionCount: number;
}
