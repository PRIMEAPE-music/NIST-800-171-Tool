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

// CONFIGURABLE: Change this path to where your HTML files are located
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const OUTPUT_FILE = path.join(__dirname, '../data/ford-survey-parsed.json');

// Section files to parse - supporting both naming conventions
const SECTION_FILES = [
  'Section A.htm',
  'Section B.htm',
  'Section C.htm',
  'Section D.htm',
  'Section E.htm',
  'Section F.htm',
  'Section G.htm',
  'Section H.htm',
  'Section I.htm',
  'Section J.htm',
  'Section K.htm',
  'Section N.htm',
  'Section T.htm',
  'Section V.htm'
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

      // Try alternative patterns
      const altMatch = titleText.match(/Section ([A-Z]):\s*(.+)/);
      if (altMatch) {
        const sectionId = altMatch[1];
        const sectionName = altMatch[2].trim();

        return {
          sectionId,
          sectionName,
          riskLevel: null,
          questions: parseQuestions($)
        };
      }

      return null;
    }

    const sectionId = titleMatch[1];
    const sectionName = titleMatch[2].trim();
    const riskLevel = titleMatch[3].trim();

    return {
      sectionId,
      sectionName,
      riskLevel,
      questions: parseQuestions($)
    };

  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

function parseQuestions($: any): Question[] {
  // Get all text content
  const bodyText = $('body').text();
  const lines = bodyText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

  // Parse questions
  const questions: Question[] = [];
  let currentQuestion: Partial<Question> | null = null;
  let collectingOptions = false;

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
      if (i + 1 < lines.length) {
        currentQuestion.helpText = lines[i + 1] || null;
        i++;
      }
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
      } else if (line === 'Show possible answers' || line.startsWith('Answered by:')) {
        collectingOptions = false;
        // Continue processing this line below
      } else {
        continue;
      }
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

    // Try to detect selected answer (usually matches one of the options)
    if (currentQuestion && currentQuestion.options && currentQuestion.options.length > 0) {
      for (const option of currentQuestion.options) {
        if (line.includes(option.substring(0, 20))) {
          currentQuestion.givenAnswer!.selectedOption = option;
          break;
        }
      }
    }
  }

  // Save last question
  if (currentQuestion && currentQuestion.questionId) {
    questions.push(currentQuestion as Question);
  }

  return questions;
}

function main() {
  console.log('Starting Ford Survey HTML parsing...\n');
  console.log(`Looking for files in: ${UPLOAD_DIR}\n`);

  // Check if upload directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    console.error(`ERROR: Upload directory not found: ${UPLOAD_DIR}`);
    console.error('\nPlease create the directory and add your Section HTML files there.');
    console.error('Expected files: Section_A.htm, Section_B.htm, etc.\n');
    process.exit(1);
  }

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

  if (sections.length === 0) {
    console.error('\n❌ No sections were parsed successfully!');
    console.error('Please check that HTML files exist in the upload directory.\n');
    process.exit(1);
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
  console.log(`✓ Output saved to: ${OUTPUT_FILE}\n`);

  // Display summary
  console.log('Summary by section:');
  sections.forEach(section => {
    const answeredCount = section.questions.filter(q =>
      q.givenAnswer.selectedOption || q.givenAnswer.comments || q.givenAnswer.answeredBy
    ).length;
    console.log(`  Section ${section.sectionId}: ${section.questions.length} questions (${answeredCount} answered)`);
  });
}

// Only run if executed directly
if (require.main === module) {
  main();
}
