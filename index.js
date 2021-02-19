/**
 * TODO: add config.yml to repo
 */
const YAML = require('yaml')
const fs = require('fs')
const Eris = require("eris")
const robot = require("robotjs")
const Jimp = require('jimp')
const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')

// Redis init
const { promisify } = require("util")
const redis = require("redis")
const rclient = redis.createClient()
const funcs = [ 'hset', 'hgetall', 'hdel' ]
const r = {}
funcs.forEach(func => {
  r[func] = promisify(rclient[func]).bind(rclient)
})

rclient.on("error", function(error) {
  console.error(error)
})

// Load config
const configFile = fs.readFileSync('./config.yml', 'utf8')
const config = YAML.parse(configFile)

const click = button => {
  robot.mouseToggle('down', button)
  setTimeout(() => {
    robot.mouseToggle('up', button)
  }, 50)
}

let counter = {}
const processSteps = async (bot, msg, steps) => {
  for (let i = 0; i < steps.length; i++) {
    let split = steps[i].split(':')
    let type = split[0]
    split.shift()
    split = [ split.join(':') ]
    let details = split[0] ? split[0].split(',') : null

    await new Promise(next => {
      if (type === 'repeat') {
        counter[type] ? counter[type]++ : counter[type] = 1
        if (counter[type] < details[0]) {
          processSteps(bot, msg, steps)
        } else {
          delete counter[type]
          next()
        }
      } else if (type === 'move') {
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

        // Fix screenshot colors
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
            name: 'screenie.png'
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

// Internal express API for front-end (saving/pulling/deleting routines)
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/dashboard', express.static('public'))
app.get('/routines', async (req, res) => {
  let routines = await r.hgetall('remote:routines')
  res.json(routines)
})
app.put('/routine', async (req, res) => {
  if (req.body && req.body['name'] && req.body['update']) {
    r.hset('remote:routines', req.body['name'], JSON.stringify(req.body['update']))
    res.json({ 'ok': true })
  }
})
app.post('/routine', async (req, res) => {
  if (req.body && req.body['name'] && req.body['routine']) {
    r.hset('remote:routines', req.body['name'], req.body['routine'])
    res.json({ 'ok': true })
  }
})
app.delete('/routine', async (req, res) => {
  if (req.body && req.body['name']) {
    r.hdel('remote:routines', req.body['name'])
    res.json({ 'ok': true })
  }
})
app.listen(config.express.port, () => {
  console.log(`Internal API listening at http://localhost:${config.express.port}`)
})

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

bot.on("messageCreate", async (msg) => {
  if (msg.author.id !== config.discord.admin_id) return

  if (msg.content.startsWith(config.discord.prefix)) {
    let split = msg.content.split(config.discord.prefix)
    if (split[1]) {
      let command = split[1]
      let routines = await r.hgetall('remote:routines')
      if (routines[command]) {
        await bot.createMessage(msg.channel.id, 'Running macro: ' + command)
        processSteps(bot, msg, JSON.parse(routines[command]))
      }
    }
  }
})

bot.connect()