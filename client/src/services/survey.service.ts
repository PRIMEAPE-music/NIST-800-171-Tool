import axios from 'axios';
import { Survey, SurveySection } from '../types/survey.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const surveyService = {
  // Get all surveys
  getAllSurveys: async (): Promise<Survey[]> => {
    const response = await axios.get<Survey[]>(`${API_BASE_URL}/surveys`);
    return response.data;
  },

  // Get specific survey by ID
  getSurvey: async (surveyId: string): Promise<Survey> => {
    const response = await axios.get<Survey>(`${API_BASE_URL}/surveys/${surveyId}`);
    return response.data;
  },

  // Get specific section
  getSection: async (surveyId: string, sectionId: string): Promise<SurveySection> => {
    const response = await axios.get<SurveySection>(
      `${API_BASE_URL}/surveys/${surveyId}/sections/${sectionId}`
    );
    return response.data;
  }
};
