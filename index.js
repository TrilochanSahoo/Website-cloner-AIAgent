require("dotenv").config();
const OpenAI = require("openai");
const SYSTEM_PROMPT = require('./Prompts/system_prompts');
const clonedSiteCommand = require('./feature');
const readline = require("readline");

const client = new OpenAI()

const TOOL_MAP = {
  clonedSiteCommand : clonedSiteCommand
};

async function main(input){
  const SYS_PROMPT = SYSTEM_PROMPT

  const messages = [
    {
      role: 'system',
      content : SYS_PROMPT
    },
    {
      role : 'user',
      content : input
    }
  ]

  while(true){
    const response = await client.chat.completions.create({
      model : 'gpt-4.1-mini',
      messages : messages
    })

    const rawContent = response.choices[0].message.content
    const parsedContent = JSON.parse(rawContent)

    messages.push({
      role:'assistant',
      content : JSON.stringify(parsedContent)
    })

    if(parsedContent.step === 'START'){
      console.log(`✨`, parsedContent.content)
      continue
    }

    if(parsedContent.step === 'THINK'){
      console.log(`\t🤔`, parsedContent.content);
      continue;
    }

    if(parsedContent.step === 'TOOL'){
      const toolToCall = parsedContent.tool_name;
      if(!TOOL_MAP[toolToCall]){
        messages.push({
          role:'developer',
          content :  `There is no such tool as ${toolToCall}`
        })
        continue
      }

      const resFromTool = await TOOL_MAP[toolToCall](parsedContent.input1,parsedContent.input2);
      
      messages.push({
        role : 'developer',
        content: JSON.stringify({ step: 'OBSERVE', content: resFromTool })
      })
      continue
    }

    if (parsedContent.step === 'OUTPUT') {
      console.log(`🔥😎`, parsedContent.content);
      break;
    }
  }

}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("👉 Hey how can I help u ? ", (input) => {
  main(input)
});

