// 필요한 모듈들을 가져옵니다.
const googleTTS = require("google-tts-api");
const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");
const axios = require("axios");

// JSON 파싱을 위한 미들웨어를 설정합니다.
//app.use(express.json());

// 이 함수는 /generate 경로로 POST 요청이 왔을 때 실행됩니다.
async function processFairytaleDataExpert(receivedData) {
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
      '지금부터 동화를 제작할거야. 동화는 한국어로 작성할 것. 동화에 대한 속성을 말해줄게. 만약 속성이 비어있다면, 네가 가장 적당해보이는 값으로 대신 채워넣어서 동화를 제작해줘.\n동화 제목과 내용을 제외한 다른 말은 하지 말 것. 동화의 방식은 맨 윗 줄에 동화의 제목을 작성하고, 이후 나레이터와 등장인물들의 대사가 반복되는 형태로 만들 것.(나레이터의 대사는 일반문(쌍따옴표를 사용하지 않는 문장)으로 작성하고, 등장인물의 대사가 나오기 전, "~~~가 말했다."라는 나레이터의 대사를 넣고, 등장인물의 대사는 모두 쌍따옴표를 넣어서 작성할 것.) 또한 동화는 6 블럭으로 나눌 것. 블럭을 나눌 때 블럭을 구분하는 요소는 block_1, block_2 ... 를 블럭 위에 작성할 것.(블럭을 나누는 이유는, 동화를 게시하는 사이트에서 6페이지 짜리 동화를 만들라고 했기 때문에, 페이지를 구분하기 위함.) 내용이 블럭으로 나뉨에 따라 끊기지 않도록 나눌 것.',
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

  console.log(sections)

  //  2. TTS API를 통해 음성 파일을 생성합니다.

  await textToSpeechForSections(sections);

  // // 3. Image API를 통해 이미지를 생성합니다.

  // 여기서는 생성된 데이터를 JSON 형태로 응답합니다.
  return {
    story: story.response.text(),
    // imageFiles: imageFiles,
    // audioFiles: audioFiles,
  };
}

async function processFairytaleDataBeginner(receivedData) {
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
      '지금부터 동화를 제작할거야. 동화는 한국어로 작성할 것. 동화에 대한 속성을 말해줄게. 만약 속성이 비어있다면, 네가 가장 적당해보이는 값으로 대신 채워넣어서 동화를 제작해줘.\n동화 제목과 내용을 제외한 다른 말은 하지 말 것. 동화의 방식은 맨 윗 줄에 동화의 제목을 작성하고, 이후 나레이터와 등장인물들의 대사가 반복되는 형태로 만들 것.(나레이터의 대사는 일반문(쌍따옴표를 사용하지 않는 문장)으로 작성하고, 등장인물의 대사가 나오기 전, "~~~가 말했다."라는 나레이터의 대사를 넣고, 등장인물의 대사는 모두 쌍따옴표를 넣어서 작성할 것.) 또한 동화는 6 블럭으로 나눌 것. 블럭을 나눌 때 블럭을 구분하는 요소는 block_1, block_2 ... 를 블럭 위에 작성할 것.(블럭을 나누는 이유는, 동화를 게시하는 사이트에서 6페이지 짜리 동화를 만들라고 했기 때문에, 페이지를 구분하기 위함.) 내용이 블럭으로 나뉨에 따라 끊기지 않도록 나눌 것.',
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

  console.log(sections)

  //  2. TTS API를 통해 음성 파일을 생성합니다.

  await textToSpeechForSections(sections);
  
  // 3. Image API를 통해 이미지를 생성합니다.

  // 여기서는 생성된 데이터를 JSON 형태로 응답합니다.
  return {
    story: story.response.text(),
    // imageFiles: imageFiles,
    // audioFiles: audioFiles,
  };
}

async function textToSpeechForSections(sections) {
  for (let i = 0; i < sections.length; i++) {
    const text = sections[i];
    const language = "ko"; // 언어 설정 (한국어: 'ko', 영어: 'en')
    const ttsPath = path.join(__dirname, "../public", `tts${i}.mp3`);

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

module.exports = { processFairytaleDataExpert, processFairytaleDataBeginner };