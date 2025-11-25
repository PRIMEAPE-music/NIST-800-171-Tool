# 📋 CLAUDE CODE INSTRUCTION FILE: Cybersecurity Survey System

## Project: NIST 800-171 Compliance Management - Survey Module

---

## 🎯 OBJECTIVE

Parse Ford SIG Lite 2024 survey HTML files, extract questions/answers, create database schema, and build a complete Survey management UI with:
- Survey selection page (list/card views)
- Individual survey viewer with accordion-style questions
- Display of given answers beneath each question
- Sidebar navigation integration

---

## 📁 INPUT FILES

**Location:** `/mnt/user-data/uploads/`

Files to parse:
- Section_A.htm
- Section_B.htm
- Section_C.htm
- Section_D.htm
- Section_E.htm
- Section_F.htm
- Section_G.htm
- Section_H.htm
- Section_I.htm
- Section_J.htm
- Section_K.htm
- Section_N.htm
- Section_T.htm
- Section_V.htm

---

## 📊 PHASE 1: HTML PARSING & DATA EXTRACTION

### Step 1.1: Create HTML Parser Script

**File:** `scripts/parseFordSurvey.ts`

Create a TypeScript script that:

1. **Reads each HTML file** and extracts:
   - Section ID (A, B, C, etc.)
   - Section title (e.g., "Enterprise Risk Management")
   - Risk level (e.g., "High Availability")
   - All questions with structure:
     ```typescript
     {
       questionId: string;        // e.g., "A.1"
       questionText: string;      // The actual question
       helpText: string | null;   // Help text if available
       answerType: "single-choice" | "multiple-choice" | "text";
       options: string[];         // Available answer options
       givenAnswer: {
         selectedOption: string | string[] | null;
         comments: string | null;
         answeredBy: string | null;
         answeredDate: string | null;
       }
     }
     ```

2. **Parsing Logic:**
   ```typescript
   - Use BeautifulSoup or Cheerio for HTML parsing
   - Identify question blocks by looking for patterns:
     * Question ID format: Letter.Number (e.g., "A.1")
     * "Answered by:" indicates response metadata
     * "Date:" for answer timestamp
     * Multiple choice options typically start with "Yes," / "No," / "Not applicable"
   - Extract help text (usually appears after question text)
   - Identify selected answers (may be marked or implied)
   - Extract comments sections
   ```

3. **Output Format:**
   ```json
   {
     "surveyId": "ford-sig-lite-2024",
     "surveyName": "Ford SIG Lite 2024",
     "surveyDescription": "Standardized Information Gathering (SIG) Lite questionnaire for cybersecurity assessment",
     "createdDate": "2024-07-12",
     "sections": [
       {
         "sectionId": "A",
         "sectionName": "Enterprise Risk Management",
         "riskLevel": "High Availability",
         "questions": [
           {
             "questionId": "A.1",
             "questionText": "Is there a formalized risk governance plan approved by management that defines the Enterprise Risk Management program requirements?",
             "helpText": null,
             "answerType": "single-choice",
             "options": [
               "Yes, there is a formalized risk governance plan approved by management that defines the Enterprise Risk Management program requirements",
               "No, there is not a formalized risk governance plan approved by management that defines the Enterprise Risk Management program requirements",
               "Not applicable"
             ],
             "givenAnswer": {
               "selectedOption": "No, there is not a formalized risk governance plan approved by management that defines the Enterprise Risk Management program requirements",
               "comments": null,
               "answeredBy": "K Cain",
               "answeredDate": "2024-07-12"
             }
           }
         ]
       }
     ]
   }
   ```

4. **Save output to:** `server/data/ford-survey-parsed.json`

### Step 1.2: Parser Implementation

```typescript
// scripts/parseFordSurvey.ts

import * as fs from 'fs';
import * as path from 'path';
import { load } from 'cheerio';

interface GivenAnswer {
  selectedOption: string | string[] | null;
  comments: string | null;
  answeredBy: string | null;
  answeredDate: string | null;
}

interface Question {
  questionId: string;
  questionText: string;
  helpText: string | null;
  answerType: 'single-choice' | 'multiple-choice' | 'text';
  options: string[];
  givenAnswer: GivenAnswer;
}

interface Section {
  sectionId: string;
  sectionName: string;
  riskLevel: string | null;
  questions: Question[];
}

interface Survey {
  surveyId: string;
  surveyName: string;
  surveyDescription: string;
  createdDate: string;
  sections: Section[];
}

const UPLOAD_DIR = '/mnt/user-data/uploads';
const OUTPUT_FILE = path.join(__dirname, '../server/data/ford-survey-parsed.json');

// Section files to parse
const SECTION_FILES = [
  'Section_A.htm',
  'Section_B.htm',
  'Section_C.htm',
  'Section_D.htm',
  'Section_E.htm',
  'Section_F.htm',
  'Section_G.htm',
  'Section_H.htm',
  'Section_I.htm',
  'Section_J.htm',
  'Section_K.htm',
  'Section_N.htm',
  'Section_T.htm',
  'Section_V.htm'
];

function parseHTMLFile(filePath: string): Section | null {
  try {
    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = load(html);
    
    // Extract section title from h1
    const titleText = $('h1').first().text().trim();
    const titleMatch = titleText.match(/Section ([A-Z]):\s*(.+?)\s*-\s*\((.+?)\)/);
    
    if (!titleMatch) {
      console.warn(`Could not parse title from ${filePath}`);
      return null;
    }
    
    const sectionId = titleMatch[1];
    const sectionName = titleMatch[2].trim();
    const riskLevel = titleMatch[3].trim();
    
    // Get all text content
    const bodyText = $('body').text();
    const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Parse questions
    const questions: Question[] = [];
    let currentQuestion: Partial<Question> | null = null;
    let collectingOptions = false;
    let collectingAnswer = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect question ID (e.g., "A.1")
      const questionIdMatch = line.match(/^([A-Z])\.(\d+)$/);
      if (questionIdMatch && i + 1 < lines.length) {
        // Save previous question
        if (currentQuestion && currentQuestion.questionId) {
          questions.push(currentQuestion as Question);
        }
        
        // Start new question
        currentQuestion = {
          questionId: questionIdMatch[0],
          questionText: '',
          helpText: null,
          answerType: 'single-choice',
          options: [],
          givenAnswer: {
            selectedOption: null,
            comments: null,
            answeredBy: null,
            answeredDate: null
          }
        };
        
        // Next line should be question text
        i++;
        if (i < lines.length) {
          currentQuestion.questionText = lines[i];
        }
        continue;
      }
      
      // Detect help text
      if (line === 'Help Text' && currentQuestion) {
        currentQuestion.helpText = lines[i + 1] || null;
        i++;
        continue;
      }
      
      // Detect answer options section
      if (line.includes('Please select') && line.includes('following options')) {
        collectingOptions = true;
        continue;
      }
      
      // Collect options
      if (collectingOptions && currentQuestion) {
        if (line.startsWith('Yes,') || line.startsWith('No,') || line === 'Not applicable') {
          currentQuestion.options!.push(line);
        } else if (line === 'Show possible answers') {
          collectingOptions = false;
        }
        continue;
      }
      
      // Detect answered by
      if (line.startsWith('Answered by:') && currentQuestion) {
        const answeredBy = line.replace('Answered by:', '').trim();
        currentQuestion.givenAnswer!.answeredBy = answeredBy || null;
        continue;
      }
      
      // Detect date
      if (line.startsWith('Date:') && currentQuestion) {
        const dateStr = line.replace('Date:', '').trim();
        currentQuestion.givenAnswer!.answeredDate = dateStr || null;
        continue;
      }
      
      // Detect comments
      if (line === 'Comments' && currentQuestion) {
        // Next line might be the comment
        if (i + 1 < lines.length && lines[i + 1] !== 'Data Location:') {
          currentQuestion.givenAnswer!.comments = lines[i + 1];
          i++;
        }
        continue;
      }
    }
    
    // Save last question
    if (currentQuestion && currentQuestion.questionId) {
      questions.push(currentQuestion as Question);
    }
    
    return {
      sectionId,
      sectionName,
      riskLevel,
      questions
    };
    
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

function main() {
  console.log('Starting Ford Survey HTML parsing...\n');
  
  const sections: Section[] = [];
  
  for (const fileName of SECTION_FILES) {
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }
    
    console.log(`Parsing ${fileName}...`);
    const section = parseHTMLFile(filePath);
    
    if (section) {
      sections.push(section);
      console.log(`  ✓ Extracted ${section.questions.length} questions from Section ${section.sectionId}`);
    } else {
      console.warn(`  ✗ Failed to parse ${fileName}`);
    }
  }
  
  const survey: Survey = {
    surveyId: 'ford-sig-lite-2024',
    surveyName: 'Ford SIG Lite 2024',
    surveyDescription: 'Standardized Information Gathering (SIG) Lite questionnaire for cybersecurity assessment',
    createdDate: new Date().toISOString().split('T')[0],
    sections: sections.sort((a, b) => a.sectionId.localeCompare(b.sectionId))
  };
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(survey, null, 2));
  
  console.log(`\n✓ Successfully parsed ${sections.length} sections`);
  console.log(`✓ Total questions: ${sections.reduce((sum, s) => sum + s.questions.length, 0)}`);
  console.log(`✓ Output saved to: ${OUTPUT_FILE}`);
}

main();
```

### Step 1.3: Install Required Dependencies

```bash
cd /home/claude/nist-compliance-app
npm install cheerio @types/cheerio --save-dev
```

### Step 1.4: Execute Parser

```bash
npx ts-node scripts/parseFordSurvey.ts
```

**Expected Output:**
```
Starting Ford Survey HTML parsing...

Parsing Section_A.htm...
  ✓ Extracted 15 questions from Section A
Parsing Section_B.htm...
  ✓ Extracted 12 questions from Section B
...

✓ Successfully parsed 14 sections
✓ Total questions: 180
✓ Output saved to: server/data/ford-survey-parsed.json
```

---

## 📊 PHASE 2: DATABASE SCHEMA

### Step 2.1: Update Prisma Schema

**File:** `server/prisma/schema.prisma`

**Add to existing schema:**

```prisma
// Surveys and Questionnaires
model Survey {
  id          Int      @id @default(autoincrement())
  surveyId    String   @unique // e.g., "ford-sig-lite-2024"
  name        String   // e.g., "Ford SIG Lite 2024"
  description String?
  createdDate DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  sections    SurveySection[]
  
  @@map("surveys")
}

model SurveySection {
  id         Int      @id @default(autoincrement())
  surveyId   Int
  sectionId  String   // e.g., "A"
  name       String   // e.g., "Enterprise Risk Management"
  riskLevel  String?  // e.g., "High Availability"
  sortOrder  Int      @default(0)
  
  survey     Survey   @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  questions  SurveyQuestion[]
  
  @@unique([surveyId, sectionId])
  @@map("survey_sections")
}

model SurveyQuestion {
  id            Int      @id @default(autoincrement())
  sectionId     Int
  questionId    String   // e.g., "A.1"
  questionText  String   @db.Text
  helpText      String?  @db.Text
  answerType    String   // "single-choice", "multiple-choice", "text"
  options       Json?    // Array of answer options
  sortOrder     Int      @default(0)
  
  section       SurveySection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  answers       SurveyAnswer[]
  
  @@unique([sectionId, questionId])
  @@map("survey_questions")
}

model SurveyAnswer {
  id              Int      @id @default(autoincrement())
  questionId      Int
  selectedOption  Json?    // String or Array of strings
  comments        String?  @db.Text
  answeredBy      String?
  answeredDate    DateTime?
  createdAt       DateTime @default(now())
  
  question        SurveyQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  
  @@map("survey_answers")
}
```

### Step 2.2: Generate Prisma Client

```bash
cd server
npx prisma migrate dev --name add_survey_schema
npx prisma generate
```

---

## 📊 PHASE 3: DATA SEEDING

### Step 3.1: Create Seed Script

**File:** `server/scripts/seedSurveys.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ParsedSurvey {
  surveyId: string;
  surveyName: string;
  surveyDescription: string;
  createdDate: string;
  sections: Array<{
    sectionId: string;
    sectionName: string;
    riskLevel: string | null;
    questions: Array<{
      questionId: string;
      questionText: string;
      helpText: string | null;
      answerType: string;
      options: string[];
      givenAnswer: {
        selectedOption: string | string[] | null;
        comments: string | null;
        answeredBy: string | null;
        answeredDate: string | null;
      };
    }>;
  }>;
}

async function seedSurveys() {
  try {
    console.log('Starting survey data seeding...\n');
    
    // Load parsed survey data
    const dataPath = path.join(__dirname, '../data/ford-survey-parsed.json');
    const surveyData: ParsedSurvey = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    // Check if survey already exists
    const existing = await prisma.survey.findUnique({
      where: { surveyId: surveyData.surveyId }
    });
    
    if (existing) {
      console.log(`Survey ${surveyData.surveyId} already exists. Deleting...`);
      await prisma.survey.delete({ where: { id: existing.id } });
    }
    
    // Create survey
    console.log(`Creating survey: ${surveyData.surveyName}`);
    const survey = await prisma.survey.create({
      data: {
        surveyId: surveyData.surveyId,
        name: surveyData.surveyName,
        description: surveyData.surveyDescription,
        createdDate: new Date(surveyData.createdDate)
      }
    });
    
    console.log(`✓ Created survey with ID: ${survey.id}\n`);
    
    // Create sections and questions
    for (let sIdx = 0; sIdx < surveyData.sections.length; sIdx++) {
      const sectionData = surveyData.sections[sIdx];
      
      console.log(`Creating Section ${sectionData.sectionId}: ${sectionData.sectionName}`);
      
      const section = await prisma.surveySection.create({
        data: {
          surveyId: survey.id,
          sectionId: sectionData.sectionId,
          name: sectionData.sectionName,
          riskLevel: sectionData.riskLevel,
          sortOrder: sIdx
        }
      });
      
      // Create questions
      for (let qIdx = 0; qIdx < sectionData.questions.length; qIdx++) {
        const questionData = sectionData.questions[qIdx];
        
        const question = await prisma.surveyQuestion.create({
          data: {
            sectionId: section.id,
            questionId: questionData.questionId,
            questionText: questionData.questionText,
            helpText: questionData.helpText,
            answerType: questionData.answerType,
            options: questionData.options,
            sortOrder: qIdx
          }
        });
        
        // Create answer if exists
        if (questionData.givenAnswer.selectedOption || 
            questionData.givenAnswer.comments ||
            questionData.givenAnswer.answeredBy) {
          
          await prisma.surveyAnswer.create({
            data: {
              questionId: question.id,
              selectedOption: questionData.givenAnswer.selectedOption,
              comments: questionData.givenAnswer.comments,
              answeredBy: questionData.givenAnswer.answeredBy,
              answeredDate: questionData.givenAnswer.answeredDate 
                ? new Date(questionData.givenAnswer.answeredDate)
                : null
            }
          });
        }
      }
      
      console.log(`  ✓ Created ${sectionData.questions.length} questions`);
    }
    
    console.log('\n✓ Survey seeding completed successfully!');
    console.log(`✓ Total sections: ${surveyData.sections.length}`);
    console.log(`✓ Total questions: ${surveyData.sections.reduce((sum, s) => sum + s.questions.length, 0)}`);
    
  } catch (error) {
    console.error('Error seeding surveys:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSurveys();
```

### Step 3.2: Execute Seed Script

```bash
cd server
npx ts-node scripts/seedSurveys.ts
```

---

## 📊 PHASE 4: BACKEND API ROUTES

### Step 4.1: Create Survey Routes

**File:** `server/src/routes/surveys.ts`

```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/surveys - Get all surveys
router.get('/', async (req, res) => {
  try {
    const surveys = await prisma.survey.findMany({
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: {
              select: { questions: true }
            }
          }
        }
      },
      orderBy: { createdDate: 'desc' }
    });
    
    res.json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// GET /api/surveys/:surveyId - Get specific survey with all data
router.get('/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    
    const survey = await prisma.survey.findUnique({
      where: { surveyId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                answers: {
                  orderBy: { createdAt: 'desc' },
                  take: 1 // Get most recent answer
                }
              }
            }
          }
        }
      }
    });
    
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    res.json(survey);
  } catch (error) {
    console.error('Error fetching survey:', error);
    res.status(500).json({ error: 'Failed to fetch survey' });
  }
});

// GET /api/surveys/:surveyId/sections/:sectionId - Get specific section
router.get('/:surveyId/sections/:sectionId', async (req, res) => {
  try {
    const { surveyId, sectionId } = req.params;
    
    const survey = await prisma.survey.findUnique({
      where: { surveyId }
    });
    
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    const section = await prisma.surveySection.findFirst({
      where: {
        surveyId: survey.id,
        sectionId
      },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            answers: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });
    
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    res.json(section);
  } catch (error) {
    console.error('Error fetching section:', error);
    res.status(500).json({ error: 'Failed to fetch section' });
  }
});

export default router;
```

### Step 4.2: Register Routes

**File:** `server/src/index.ts`

🔍 **FIND:**
```typescript
// Routes
app.use('/api/controls', controlRoutes);
app.use('/api/poam', poamRoutes);
app.use('/api/evidence', evidenceRoutes);
```

✏️ **REPLACE WITH:**
```typescript
// Routes
app.use('/api/controls', controlRoutes);
app.use('/api/poam', poamRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/surveys', surveyRoutes);
```

🔍 **FIND:**
```typescript
import evidenceRoutes from './routes/evidence';
```

✏️ **ADD AFTER:**
```typescript
import surveyRoutes from './routes/surveys';
```

---

## 📊 PHASE 5: FRONTEND - TYPES

### Step 5.1: Create Survey Types

**File:** `client/src/types/survey.ts`

```typescript
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
  options: string[] | null;
  sortOrder: number;
  answers?: SurveyAnswer[];
}

export interface SurveyAnswer {
  id: number;
  questionId: number;
  selectedOption: string | string[] | null;
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
```

---

## 📊 PHASE 6: FRONTEND - API SERVICE

### Step 6.1: Create Survey API Service

**File:** `client/src/services/surveyService.ts`

```typescript
import axios from 'axios';
import { Survey, SurveySection } from '../types/survey';

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
```

---

## 📊 PHASE 7: FRONTEND - COMPONENTS

### Step 7.1: Surveys List Page

**File:** `client/src/pages/Surveys.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  ViewList as ListIcon,
  ViewModule as CardIcon,
  Assignment as SurveyIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '../services/surveyService';
import { Survey } from '../types/survey';

const Surveys: React.FC = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const data = await surveyService.getAllSurveys();
      setSurveys(data);
      setError(null);
    } catch (err) {
      console.error('Error loading surveys:', err);
      setError('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleSurveyClick = (surveyId: string) => {
    navigate(`/surveys/${surveyId}`);
  };

  const getSurveyStats = (survey: Survey) => {
    const sectionCount = survey.sections?.length || 0;
    const questionCount = survey.sections?.reduce(
      (sum, section) => sum + (section._count?.questions || 0),
      0
    ) || 0;
    return { sectionCount, questionCount };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Cybersecurity Surveys
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage compliance questionnaires
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          aria-label="view mode"
          size="small"
        >
          <ToggleButton value="card" aria-label="card view">
            <CardIcon sx={{ mr: 1 }} />
            Card
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <ListIcon sx={{ mr: 1 }} />
            List
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Card View */}
      {viewMode === 'card' && (
        <Grid container spacing={3}>
          {surveys.map((survey) => {
            const stats = getSurveyStats(survey);
            return (
              <Grid item xs={12} sm={6} md={4} key={survey.id}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: '#1E1E1E',
                    border: '1px solid #2C2C2C',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: '#242424',
                      borderColor: '#1976d2',
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 20px rgba(25, 118, 210, 0.15)'
                    }
                  }}
                >
                  <CardActionArea
                    onClick={() => handleSurveyClick(survey.surveyId)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <SurveyIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {survey.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(survey.createdDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>

                      {survey.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2, minHeight: 40 }}
                        >
                          {survey.description}
                        </Typography>
                      )}

                      <Divider sx={{ my: 2, borderColor: '#2C2C2C' }} />

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`${stats.sectionCount} Sections`}
                          size="small"
                          sx={{ bgcolor: '#2C2C2C' }}
                        />
                        <Chip
                          label={`${stats.questionCount} Questions`}
                          size="small"
                          sx={{ bgcolor: '#2C2C2C' }}
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Paper sx={{ bgcolor: '#1E1E1E', border: '1px solid #2C2C2C' }}>
          <List>
            {surveys.map((survey, index) => {
              const stats = getSurveyStats(survey);
              return (
                <React.Fragment key={survey.id}>
                  {index > 0 && <Divider sx={{ borderColor: '#2C2C2C' }} />}
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleSurveyClick(survey.surveyId)}
                      sx={{
                        py: 2,
                        '&:hover': {
                          bgcolor: '#242424'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <SurveyIcon sx={{ fontSize: 32, color: '#1976d2' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {survey.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {survey.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {survey.description}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <Chip
                                label={`${stats.sectionCount} Sections`}
                                size="small"
                                sx={{ bgcolor: '#2C2C2C' }}
                              />
                              <Chip
                                label={`${stats.questionCount} Questions`}
                                size="small"
                                sx={{ bgcolor: '#2C2C2C' }}
                              />
                              <Chip
                                label={new Date(survey.createdDate).toLocaleDateString()}
                                size="small"
                                sx={{ bgcolor: '#2C2C2C' }}
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <ChevronRightIcon sx={{ color: 'text.secondary' }} />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      )}

      {surveys.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#1E1E1E', border: '1px solid #2C2C2C' }}>
          <SurveyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No surveys available
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Surveys;
```

### Step 7.2: Survey Detail Page

**File:** `client/src/pages/SurveyDetail.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Card,
  CardContent
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { surveyService } from '../services/surveyService';
import { Survey, SurveyQuestion } from '../types/survey';

const SurveyDetail: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | false>(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | false>(false);

  useEffect(() => {
    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId]);

  const loadSurvey = async () => {
    if (!surveyId) return;
    
    try {
      setLoading(true);
      const data = await surveyService.getSurvey(surveyId);
      setSurvey(data);
      setError(null);
    } catch (err) {
      console.error('Error loading survey:', err);
      setError('Failed to load survey details');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (sectionId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSection(isExpanded ? sectionId : false);
  };

  const handleQuestionChange = (questionId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedQuestion(isExpanded ? questionId : false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const renderAnswer = (question: SurveyQuestion) => {
    const answer = question.answers?.[0];
    
    if (!answer) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No answer provided for this question
        </Alert>
      );
    }

    return (
      <Card sx={{ mt: 2, bgcolor: '#242424', border: '1px solid #2C2C2C' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1976d2' }}>
            Given Answer:
          </Typography>

          {/* Selected Option */}
          {answer.selectedOption && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Selected:
              </Typography>
              <Box sx={{ pl: 2 }}>
                {Array.isArray(answer.selectedOption) ? (
                  answer.selectedOption.map((opt, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <CheckIcon sx={{ fontSize: 16, color: '#4caf50', mr: 1 }} />
                      <Typography variant="body2">{opt}</Typography>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckIcon sx={{ fontSize: 16, color: '#4caf50', mr: 1 }} />
                    <Typography variant="body2">{answer.selectedOption}</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Comments */}
          {answer.comments && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Comments:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#1E1E1E', border: '1px solid #2C2C2C' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {answer.comments}
                </Typography>
              </Paper>
            </Box>
          )}

          <Divider sx={{ my: 2, borderColor: '#2C2C2C' }} />

          {/* Metadata */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {answer.answeredBy && (
              <Chip
                label={`By: ${answer.answeredBy}`}
                size="small"
                sx={{ bgcolor: '#2C2C2C' }}
              />
            )}
            {answer.answeredDate && (
              <Chip
                label={`Date: ${formatDate(answer.answeredDate)}`}
                size="small"
                sx={{ bgcolor: '#2C2C2C' }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !survey) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Survey not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component={RouterLink}
          to="/surveys"
          sx={{ display: 'flex', alignItems: 'center', color: '#1976d2', textDecoration: 'none' }}
        >
          <BackIcon sx={{ mr: 0.5, fontSize: 20 }} />
          Surveys
        </Link>
        <Typography color="text.primary">{survey.name}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#1E1E1E', border: '1px solid #2C2C2C' }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          {survey.name}
        </Typography>
        {survey.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {survey.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`${survey.sections?.length || 0} Sections`}
            size="small"
            sx={{ bgcolor: '#2C2C2C' }}
          />
          <Chip
            label={`Created: ${formatDate(survey.createdDate)}`}
            size="small"
            sx={{ bgcolor: '#2C2C2C' }}
          />
        </Box>
      </Paper>

      {/* Sections */}
      {survey.sections?.map((section) => (
        <Accordion
          key={section.id}
          expanded={expandedSection === section.sectionId}
          onChange={handleSectionChange(section.sectionId)}
          sx={{
            mb: 2,
            bgcolor: '#1E1E1E',
            border: '1px solid #2C2C2C',
            '&:before': { display: 'none' },
            '&.Mui-expanded': {
              bgcolor: '#242424',
              borderColor: '#1976d2'
            }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              '&:hover': {
                bgcolor: '#242424'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Section {section.sectionId}: {section.name}
                </Typography>
                {section.riskLevel && (
                  <Typography variant="caption" color="text.secondary">
                    {section.riskLevel}
                  </Typography>
                )}
              </Box>
              <Chip
                label={`${section.questions?.length || 0} Questions`}
                size="small"
                sx={{ bgcolor: '#2C2C2C' }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {/* Questions */}
            {section.questions?.map((question) => (
              <Accordion
                key={question.id}
                expanded={expandedQuestion === question.questionId}
                onChange={handleQuestionChange(question.questionId)}
                sx={{
                  mb: 1,
                  bgcolor: '#242424',
                  border: '1px solid #2C2C2C',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    bgcolor: '#2C2C2C'
                  }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '&:hover': {
                      bgcolor: '#2C2C2C'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', pr: 2 }}>
                    {question.answers?.[0] ? (
                      <CheckIcon sx={{ color: '#4caf50', mr: 2, mt: 0.5 }} />
                    ) : (
                      <UncheckedIcon sx={{ color: 'text.secondary', mr: 2, mt: 0.5 }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {question.questionId}
                      </Typography>
                      <Typography variant="body2">
                        {question.questionText}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* Help Text */}
                  {question.helpText && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">{question.helpText}</Typography>
                    </Alert>
                  )}

                  {/* Answer Options */}
                  {question.options && question.options.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Available Options:
                      </Typography>
                      <Box sx={{ pl: 2 }}>
                        {question.options.map((option, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <UncheckedIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              {option}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: 2, borderColor: '#2C2C2C' }} />

                  {/* Render Answer */}
                  {renderAnswer(question)}
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default SurveyDetail;
```

---

## 📊 PHASE 8: ROUTING & NAVIGATION

### Step 8.1: Add Routes

**File:** `client/src/App.tsx`

🔍 **FIND:**
```typescript
import POAMDetail from './pages/POAMDetail';
```

✏️ **ADD AFTER:**
```typescript
import Surveys from './pages/Surveys';
import SurveyDetail from './pages/SurveyDetail';
```

🔍 **FIND:**
```typescript
<Route path="/poam/:id" element={<POAMDetail />} />
```

✏️ **ADD AFTER:**
```typescript
<Route path="/surveys" element={<Surveys />} />
<Route path="/surveys/:surveyId" element={<SurveyDetail />} />
```

### Step 8.2: Update Sidebar Navigation

**File:** `client/src/components/Sidebar.tsx`

🔍 **FIND:**
```typescript
import {
  Dashboard as DashboardIcon,
  Description as ControlIcon,
  Warning as POAMIcon,
  Folder as EvidenceIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
```

✏️ **REPLACE WITH:**
```typescript
import {
  Dashboard as DashboardIcon,
  Description as ControlIcon,
  Warning as POAMIcon,
  Folder as EvidenceIcon,
  Assessment as AssessmentIcon,
  Assignment as SurveyIcon,
} from '@mui/icons-material';
```

🔍 **FIND:**
```typescript
const menuItems = [
  { title: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { title: 'Controls', icon: <ControlIcon />, path: '/controls' },
  { title: 'POAM', icon: <POAMIcon />, path: '/poam' },
  { title: 'Evidence', icon: <EvidenceIcon />, path: '/evidence' },
  { title: 'Assessment', icon: <AssessmentIcon />, path: '/assessment' },
];
```

✏️ **REPLACE WITH:**
```typescript
const menuItems = [
  { title: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { title: 'Controls', icon: <ControlIcon />, path: '/controls' },
  { title: 'POAM', icon: <POAMIcon />, path: '/poam' },
  { title: 'Evidence', icon: <EvidenceIcon />, path: '/evidence' },
  { title: 'Surveys', icon: <SurveyIcon />, path: '/surveys' },
  { title: 'Assessment', icon: <AssessmentIcon />, path: '/assessment' },
];
```

---

## 📊 PHASE 9: TESTING & VERIFICATION

### Step 9.1: Start Development Servers

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### Step 9.2: Verification Checklist

**Backend Verification:**
- [ ] Parser script executes without errors
- [ ] JSON file created with all survey data
- [ ] Database migration successful
- [ ] Seed script populates database
- [ ] API endpoints respond correctly:
  - GET `/api/surveys`
  - GET `/api/surveys/ford-sig-lite-2024`
  - GET `/api/surveys/ford-sig-lite-2024/sections/A`

**Frontend Verification:**
- [ ] Surveys page loads and displays survey card
- [ ] Card/List toggle works
- [ ] Clicking survey navigates to detail page
- [ ] Survey detail page displays all sections
- [ ] Sections expand to show questions
- [ ] Questions expand to show:
  - Question text
  - Help text (if available)
  - Available options
  - Given answer (selected option, comments, metadata)
- [ ] Breadcrumb navigation works
- [ ] Sidebar "Surveys" link navigates correctly

### Step 9.3: Test Queries

```bash
# Test API endpoints
curl http://localhost:3001/api/surveys
curl http://localhost:3001/api/surveys/ford-sig-lite-2024
```

---

## 📊 PHASE 10: FINAL TOUCHES

### Step 10.1: Add Loading States

Ensure all components handle:
- Initial loading (CircularProgress)
- Empty states (no surveys, no questions)
- Error states (API failures)

### Step 10.2: Responsive Design

Verify UI works on:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

### Step 10.3: Dark Theme Consistency

Verify all components use:
- Background: `#121212`, `#1E1E1E`, `#242424`, `#2C2C2C`
- Primary color: `#1976d2`
- Text: Default MUI dark theme
- Borders: `#2C2C2C`

---

## ✅ COMPLETION CHECKLIST

### Data Processing
- [ ] HTML parser script created and executed
- [ ] All 14 section files parsed successfully
- [ ] JSON output file contains all questions and answers
- [ ] Data validation (no missing questions)

### Database
- [ ] Prisma schema updated with survey models
- [ ] Migration executed successfully
- [ ] Seed script populates all data
- [ ] Database contains all surveys, sections, questions, and answers

### Backend API
- [ ] Survey routes created
- [ ] Routes registered in server
- [ ] All endpoints tested and working
- [ ] Proper error handling implemented

### Frontend
- [ ] TypeScript types defined
- [ ] API service created
- [ ] Surveys list page implemented (card/list views)
- [ ] Survey detail page implemented (accordion questions)
- [ ] Given answers displayed beneath questions
- [ ] Routing configured
- [ ] Sidebar navigation updated

### Testing
- [ ] Backend API endpoints tested
- [ ] Frontend pages load without errors
- [ ] Data displays correctly
- [ ] Navigation works end-to-end
- [ ] Responsive design verified

### Polish
- [ ] Loading states work properly
- [ ] Error handling implemented
- [ ] Dark theme consistent throughout
- [ ] UI/UX smooth and intuitive

---

## 🚀 ESTIMATED COMPLETION TIME

- **Phase 1 (Parsing):** 30-45 minutes
- **Phase 2 (Database):** 15 minutes
- **Phase 3 (Seeding):** 10 minutes
- **Phase 4 (Backend):** 20 minutes
- **Phase 5-8 (Frontend):** 60-90 minutes
- **Phase 9 (Testing):** 30 minutes
- **Phase 10 (Polish):** 20 minutes

**Total:** ~3-4 hours

---

## 📝 NOTES

1. **Parser Complexity:** The HTML structure may vary between sections. The parser should be robust enough to handle variations.

2. **Answer Extraction:** Some questions may not have answers. Ensure the parser handles null/empty states gracefully.

3. **Multiple Answers:** If a question can have multiple responses over time, the most recent answer should be displayed.

4. **Performance:** With 180+ questions, consider implementing virtualization for large lists if performance becomes an issue.

5. **Future Enhancements:**
   - Add search/filter functionality
   - Export survey results to PDF/Excel
   - Add answer submission/editing capability
   - Implement survey templates for other assessments

---

## 🆘 TROUBLESHOOTING

**Parser fails on certain sections:**
- Check HTML structure consistency
- Add more robust error handling
- Log problematic sections for manual review

**Database seeding errors:**
- Verify Prisma schema matches data structure
- Check for unique constraint violations
- Ensure foreign key relationships are correct

**Frontend display issues:**
- Check API response structure matches TypeScript types
- Verify data is being fetched correctly
- Check browser console for errors

**Styling inconsistencies:**
- Verify all components use theme values
- Check for hardcoded colors
- Ensure proper component nesting for MUI styling

---