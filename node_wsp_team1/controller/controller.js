// 필요한 모듈들을 가져옵니다.

const { Configuration, OpenAIApi } = require("openai");
const googleTTS = require("google-tts-api");
const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");
const axios = require("axios");

// JSON 파싱을 위한 미들웨어를 설정합니다.
//app.use(express.json());

// 이 함수는 /generate 경로로 POST 요청이 왔을 때 실행됩니다.
async function processFairytaleDataExpert(receivedData, index) {
  let prompt = "";
  prompt = JSON.stringify(receivedData.story);

  console.log(prompt);

  // 1. Gemini를 통해 동화를 생성합니다.
  // 생성된 동화는 story라는 변수에 저장합니다.

  const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");

  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-8b",

    systemInstruction:
      '지금부터 동화를 제작할거야. 동화는 한국어로 작성할 것. 동화에 대한 속성을 말해줄게. 만약 속성이 비어있다면, 네가 가장 적당해보이는 값으로 대신 채워넣어서 동화를 제작해줘.\n동화 제목과 내용을 제외한 다른 말은 하지 말 것. 동화의 방식은 맨 윗 줄에 동화의 제목을 작성하고, 이후 나레이터와 등장인물들의 대사가 반복되는 형태로 만들 것.(나레이터의 대사는 일반문(쌍따옴표를 사용하지 않는 문장)으로 작성하고, 등장인물의 대사가 나오기 전, "~~~가 말했다."라는 나레이터의 대사를 넣고, 등장인물의 대사는 모두 쌍따옴표를 넣어서 작성할 것.) 또한 동화는 6개의 블럭으로 나눌 것. 절대 6개를 벗어나면 안됨. 블럭을 나눌 때 블럭을 구분하는 요소는 block_1, block_2 ... 를 블럭 위에 작성할 것.(블럭을 나누는 이유는, 동화를 게시하는 사이트에서 6페이지 짜리 동화를 만들라고 했기 때문에, 페이지를 구분하기 위함.) 따라서 동화는 (제목) block_1 (내용) block_2 ... 형식으로 만들어질 것임. 내용이 블럭으로 나뉨에 따라 끊기지 않도록 나눌 것.',
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };

  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });

  const story = await chatSession.sendMessage(prompt);
  console.log(story.response.text());

  const sections = splitStoryIntoSections(story.response.text());

  console.log(sections);

  // 2. TTS API를 통해 음성 파일을 생성합니다.

  await textToSpeechForSections(sections, index);

  // 3. Image API를 통해 이미지를 생성합니다.

  await makeImageWithOpenAI(sections, index);

  // 여기서는 생성된 데이터를 JSON 형태로 응답합니다.
  return {
    story: story.response.text(),
    // imageFiles: imageFiles,
    // audioFiles: audioFiles,
  };
}

async function processFairytaleDataBeginner(receivedData, index) {
  let prompt = "";
  prompt = JSON.stringify(receivedData);

  console.log(prompt);

  // 1. Gemini를 통해 동화를 생성합니다.
  // 생성된 동화는 story라는 변수에 저장합니다.

  const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");

  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-8b",

    systemInstruction:
      '지금부터 동화를 제작할거야. 동화는 한국어로 작성할 것. 동화에 대한 속성을 말해줄게. 만약 속성이 비어있다면, 네가 가장 적당해보이는 값으로 대신 채워넣어서 동화를 제작해줘.\n동화 제목과 내용을 제외한 다른 말은 하지 말 것. 동화의 방식은 맨 윗 줄에 동화의 제목을 작성하고, 이후 나레이터와 등장인물들의 대사가 반복되는 형태로 만들 것.(나레이터의 대사는 일반문(쌍따옴표를 사용하지 않는 문장)으로 작성하고, 등장인물의 대사가 나오기 전, "~~~가 말했다."라는 나레이터의 대사를 넣고, 등장인물의 대사는 모두 쌍따옴표를 넣어서 작성할 것.) 또한 동화는 6개의 블럭으로 나눌 것. 절대 6개를 벗어나면 안됨. 블럭을 나눌 때 블럭을 구분하는 요소는 block_1, block_2 ... 를 블럭 위에 작성할 것.(블럭을 나누는 이유는, 동화를 게시하는 사이트에서 6페이지 짜리 동화를 만들라고 했기 때문에, 페이지를 구분하기 위함.) 따라서 동화는 (제목) block_1 (내용) block_2 ... 형식으로 만들어질 것임. 내용이 블럭으로 나뉨에 따라 끊기지 않도록 나눌 것.',
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };

  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });

  const story = await chatSession.sendMessage(prompt);
  console.log(story.response.text());

  const sections = splitStoryIntoSections(story.response.text());

  console.log(sections);

  // 2. TTS API를 통해 음성 파일을 생성합니다.

  await textToSpeechForSections(sections, index);

  // 3. Image API를 통해 이미지를 생성합니다.

  await makeImageWithOpenAI(sections, index);

  // 여기서는 생성된 데이터를 JSON 형태로 응답합니다.
  return {
    story: story.response.text(),
    // imageFiles: imageFiles,
    // audioFiles: audioFiles,
  };
}

async function textToSpeechForSections(sections, index) {
  for (let i = 0; i < sections.length; i++) {
    const text = sections[i];
    const dir = "../public/" + index;
    const outputDir = path.join(__dirname, dir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const language = "ko"; // 언어 설정 (한국어: 'ko', 영어: 'en')
    const ttsPath = path.join(__dirname, dir, `tts${i}.mp3`);

    // Google TTS로 MP3 URL 생성
    const url = await googleTTS(text, language, 1);

    // URL에서 MP3 파일 다운로드
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    if (response) {
      console.log("tts success...");
    }

    const writer = fs.createWriteStream(ttsPath);
    response.data.pipe(writer);
  }
}

// 동화를 제목 + 6 블럭으로 쪼갬
function splitStoryIntoSections(story) {
  const sections = [];
  const lines = story.split('\n').filter(line => line.trim() !== ''); // 빈 줄 제거

  // 제목 추출
  const title = lines[0].trim();
  sections.push(title);

  let currentSectionContent = "";

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('block_')) {
      if (currentSectionContent !== "") {
        sections.push(currentSectionContent);
        currentSectionContent = "";
      }
    } else {
      currentSectionContent += line + "\n";
    }
  }

  // 마지막 섹션 추가
  if (currentSectionContent !== "") {
    sections.push(currentSectionContent);
  }

  return sections;
}

async function makeImageWithOpenAI(sections, index) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY, // 환경 변수에 API 키가 설정되어 있는지 확인하세요
  });
  const dir = "../public/" + index;
  const openai = new OpenAIApi(configuration);
  
  for (let i = 0; i < sections.length; i++) {
    const text = sections[i];
    const imagePath = path.join(__dirname, dir, `image${i}.png`);
    
    try {
      // OpenAI API를 사용하여 이미지 생성
      const response = await openai.createImage({
        model: "dall-e-3",
        prompt: "다음에 내가 말하는 문장들을 동화풍으로 그려줘. " + text,
        n: 1,
        size: "1024x1024",
      });
      
      const imageUrl = response.data.data[0].url;
      console.log(`이미지 URL: ${imageUrl}`);

      // axios를 사용하여 이미지 다운로드
      const imageResponse = await axios.get(imageUrl, { responseType: 'stream' });
      
      // 이미지 스트림을 파일로 저장
      const writer = fs.createWriteStream(imagePath);
      imageResponse.data.pipe(writer);

      // 파일 저장 완료를 기다림
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log(`이미지가 성공적으로 저장되었습니다: ${imagePath}`);
      
    } catch (error) {
      console.error(`이미지 생성 또는 저장 중 오류 발생: ${error.message}`);
    }
  }
}

module.exports = { processFairytaleDataExpert, processFairytaleDataBeginner };