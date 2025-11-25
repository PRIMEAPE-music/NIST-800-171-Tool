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
      scoring?: {
        likelihood: number | null;
        overallImpact: number | null;
      };
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
    const dataPath = path.join(__dirname, '../data/ford-survey-2024-corrected final.json');
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

    console.log(`OK Created survey with ID: ${survey.id}\n`);

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
            options: JSON.stringify(questionData.options),
            sortOrder: qIdx,
            likelihood: questionData.scoring?.likelihood ?? null,
            overallImpact: questionData.scoring?.overallImpact ?? null
          }
        });

        // Create answer if exists
        if (questionData.givenAnswer.selectedOption ||
            questionData.givenAnswer.comments ||
            questionData.givenAnswer.answeredBy) {

          // Convert answeredDate string to Date if exists
          let answeredDate: Date | null = null;
          if (questionData.givenAnswer.answeredDate) {
            try {
              const [month, day, year] = questionData.givenAnswer.answeredDate.split('/');
              answeredDate = new Date(`${year}-${month}-${day}`);
            } catch (e) {
              console.warn(`Could not parse date: ${questionData.givenAnswer.answeredDate}`);
            }
          }

          // Convert selectedOption to proper format
          let selectedOption: string | null = null;
          if (questionData.givenAnswer.selectedOption !== null &&
              questionData.givenAnswer.selectedOption !== undefined) {
            if (typeof questionData.givenAnswer.selectedOption === 'string') {
              selectedOption = questionData.givenAnswer.selectedOption;
            } else if (Array.isArray(questionData.givenAnswer.selectedOption)) {
              selectedOption = JSON.stringify(questionData.givenAnswer.selectedOption);
            }
          }

          await prisma.surveyAnswer.create({
            data: {
              questionId: question.id,
              selectedOption: selectedOption,
              comments: questionData.givenAnswer.comments,
              answeredBy: questionData.givenAnswer.answeredBy,
              answeredDate: answeredDate
            }
          });
        }
      }

      console.log(`  OK Created ${sectionData.questions.length} questions`);
    }

    console.log('\nOK Survey seeding completed successfully!');
    console.log(`OK Total sections: ${surveyData.sections.length}`);
    console.log(`OK Total questions: ${surveyData.sections.reduce((sum, s) => sum + s.questions.length, 0)}`);

  } catch (error) {
    console.error('Error seeding surveys:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSurveys();
