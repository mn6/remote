/**
 * TODO: add config.yml to repo
 */
const YAML = require('yaml')
const fs = require('fs')
const Eris = require("eris")
const robot = require("robotjs")
const Jimp = require('jimp')

// Load config
const configFile = fs.readFileSync('./config.yml', 'utf8')
const config = YAML.parse(configFile)
const routines = {
  'weathercheck': [
    'move:1550,641',
    'click:left',
    'move:1,1',
    'type:weather in atlanta',
    'press:enter',
    'delay:1000',
    'screenshot:1050,536,661,365'
  ]
}

const click = button => {
  robot.mouseToggle('down', button)
  setTimeout(() => {
    robot.mouseToggle('up', button)
  }, 50)
}

const processSteps = async (bot, msg, steps) => {
  for (let i = 0; i < steps.length; i++) {
    if (i === steps.length - 1) bot.createMessage(msg.channel.id, 'Finished!')
    await new Promise(next => {
      let split = steps[i].split(':')
      let type = split[0]
      let details = split[1].split(',')
  
      if (type === 'move') {
        robot.moveMouse(details[0], details[1])
        next()
      } else if (type === 'delay') {
        setTimeout(() => {
          next()
        }, details[0])    
      } else if (type === 'click') {
        click(details[0])
        next()
      } else if (type === 'screenshot') {
        let screenshot = null
        if (details[0] === 'full') {
          let screen = robot.getScreenSize()
          screenshot = robot.screen.capture(null, null, screen.width, screen.height)
          next()
        } else {
          screenshot = robot.screen.capture(details[0], details[1], details[2], details[3])
        }

        let jimg = new Jimp(screenshot.width, screenshot.height)
        // jimg.bitmap.data = screenshot.image

        let red, green, blue
        screenshot.image.forEach((byte, i) => {
          switch (i % 4) {
            case 0: return blue = byte
            case 1: return green = byte
            case 2: return red = byte
            case 3: 
              jimg.bitmap.data[i - 3] = red
              jimg.bitmap.data[i - 2] = green
              jimg.bitmap.data[i - 1] = blue
              jimg.bitmap.data[i] = 255
          }
        })

        jimg.rgba(true)
        jimg.filterType(1)
        jimg.deflateLevel(5)
        jimg.deflateStrategy(1)
        jimg.getBuffer(Jimp.MIME_PNG, (_, result)=>{
          bot.createMessage(msg.channel.id, '', {
            file: result,
            name: 'screenie.jpg'
          })
          next()
        })
      } else if (type === 'type') {
        robot.typeStringDelayed(details[0], 10000)
        next()
      } else if (type === 'press') {
        robot.keyTap(details[0])
        next()
      }
    }) 
  }
}

// Connect to Discord
const bot = new Eris(config.discord.bot_token)
bot.on("ready", () => {
  console.log('Discord bot connected!')
  // Check if bot is in a server, if not, send invite link to console
  let size = bot.guilds.size
  if (size === 0) {
    console.log(`Invite using this URL: https://discord.com/oauth2/authorize?client_id=${config.discord.bot_id}&scope=bot`)
  }
})

bot.on("messageCreate", (msg) => {
  if (msg.author.id !== config.discord.admin_id) return

  if (msg.content.startsWith(config.discord.prefix)) {
    let split = msg.content.split(config.discord.prefix)
    if (split[1]) {
      let command = split[1]
      if (routines[command]) {
        bot.createMessage(msg.channel.id, 'Running macro: ' + command)
        processSteps(bot, msg, routines[command])
      }
    }
  }
})

bot.connect()