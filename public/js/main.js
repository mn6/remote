let addition = null
const setup = () => {
  $('.routine').not('#createRoutine').remove()

  $('#createRoutine').off('click').on('click', e => {
    let newRoutine = prompt('How would you like to run your new routine? (command name)')
    addition = [newRoutine, '[\"click:left\"]']
    setup()
  })
  window.data = {}

  let template = `<div class="routine" routine-command="%command%" role="button" tabindex="0" aria-label="Edit routine: %command%"><p>%command%</p></div>`

  const http = new XMLHttpRequest()
  http.open("GET", 'http://localhost:9898/routines')
  http.send()

  http.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      let res = JSON.parse(http.responseText)
      if (!res) res = {}
      if (addition) {
        res[addition[0]] = addition[1]
        $.ajax({
          url: 'http://localhost:9898/routine',
          method: 'POST',
          data: {
            name: addition[0],
            routine: addition[1]
          },
          success: () => {
            addition = null
            setup()
          }
        })
      }
      if (!res) return
      Object.entries(res).forEach(pair => {
        let temp = template.replace(/%command%/g, pair[0])
        $('.routineList').prepend(temp)

        $(`[routine-command="${pair[0]}"]`).off('click').on('click', (e) => {
          $('body').append(window.data[pair[0]].modal)
          window.refocus = e.currentTarget
          $('.x').focus()

          $(document).off('dragover').on('dragover', '.li', e => {
            event.preventDefault()
            event.stopPropagation()
            window.lastDragged = e.currentTarget
          }).off('drag').on('drag', '.li', e => {
            window.dragged = e.currentTarget
          }).off('drop').on('drop', '.li', e => {
            event.preventDefault()
            event.stopPropagation()
            let idx1 =  $(e.currentTarget).closest('.collection').find('.li').index(window.dragged)
            let idx2 = $(e.currentTarget).closest('.collection').find('.li').index(window.lastDragged)
            if (idx2 > idx1) $(window.lastDragged).after(window.dragged)
            else $(window.lastDragged).before(window.dragged)
          })

          $(document).off('click').on('click', '.del', e => {
            $(e.target).closest('.li').remove()
          })

          $('.save').off('click').on('click', (e) => {
            let newAry = []
            $('.collection .li').each((_, item) => {
              let i = $(item).clone()
              i.find('button').remove()
              newAry.push(i.text())
            })
            if (newAry.length > 0) {
              $.ajax({
                url: 'http://localhost:9898/routine',
                method: 'PUT',
                data: {
                  name: $('.modal').attr('routine-name'),
                  update: newAry
                },
                success: () => { alert('Saved successfully!') }
              })
            }
          }).off('keydown').on('keydown', (e) => {
            if (e.keyCode === 13 || e.keyCode === 32) {
              e.preventDefault()
              e.currentTarget.click()
            }
          })

          $('.x').off('click').on('click', e => {
            $('.modalbg').remove()
            $(window.refocus).focus()
            setup()
          }).off('keydown').on('keydown', (e) => {
            if (e.keyCode === 13 || e.keyCode === 32) {
              e.preventDefault()
              e.currentTarget.click()
            }
          })

          $('.trash').off('click').on('click', e => {
            $.ajax({
              url: 'http://localhost:9898/routine',
              method: 'DELETE',
              data: {
                name: $('.modal').attr('routine-name')
              },
              success: () => {
                $('.modalbg').remove()
                setup()
              }
            })
          }).off('keydown').on('keydown', (e) => {
            if (e.keyCode === 13 || e.keyCode === 32) {
              e.preventDefault()
              e.currentTarget.click()
            }
          })

          $('.plus').off('click').on('click', e => {
            if ($('.li select')[0]) return
            let addSel = `<div class="li" draggable="true"><select class="type"><option value="null" default="true">Choose type...</option><option value="type">Type string</option><option value="delay">Delay</option><option value="press">Press key</option><option value="screenshot">Screenshot</option><option value="click">Click</option><option value="move">Move mouse</option><option value="repeat">Repeat</option></select><button class="del">&#10060;</button></div>`
            $('.collection').append(addSel)
            $('.li select').on('change', (e) => {
              let val = $(e.currentTarget).val()
              if (val === 'type') {
                let addition = `<input type="text" placeholder="Type a string here..." class="typeinput"><button class="savestep">Add</button>`
                $(e.currentTarget).closest('.li').children().not('.del, .type').remove()
                $(e.currentTarget).after(addition)
                $('button.savestep').on('click', e => {
                  let input = $('.typeinput').val()
                  if (!input || input.length < 1) return
                  let saveString = `type:${input}`
                  $(e.currentTarget).closest('.li').replaceWith(`<div class="li" draggable="true">${saveString}<button class="del">&#10006;</button></div>`)
                }).off('keydown').on('keydown', (e) => {
                  if (e.keyCode === 13 || e.keyCode === 32) {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                })
              } else if (val === 'screenshot') {
                let addition = `<div class="screenshotinputs"><input type="text" placeholder="x" class="screenx"><input type="text" placeholder="y" class="screeny"><input type="text" placeholder="width" class="screenw"><input type="text" placeholder="height" class="screenh"><button class="savestep">Add</button></div>`
                $(e.currentTarget).closest('.li').children().not('.del, .type').remove()
                $(e.currentTarget).after(addition)
                $('button.savestep').on('click', e => {
                  let input1 = $('.screenx').val()
                  let input2 = $('.screeny').val()
                  let input3 = $('.screenw').val()
                  let input4 = $('.screenh').val()
                  if (!input1 || input1.length < 1 || !input2 || input2.length < 1 || !input3 || input3.length < 1 || !input4 || input4.length < 1) return
                  let saveString = `screenshot:${input1},${input2},${input3},${input4}`
                  $(e.currentTarget).closest('.li').replaceWith(`<div class="li" draggable="true">${saveString}<button class="del">&#10006;</button></div>`)
                }).off('keydown').on('keydown', (e) => {
                  if (e.keyCode === 13 || e.keyCode === 32) {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                })
              } else if (val === 'click') {
                let addition = `<select class="clicktype"><option value="left">Left</option><option value="right">Right</option></select><button class="savestep">Add</button>`
                $(e.currentTarget).closest('.li').children().not('.del, .type').remove()
                $(e.currentTarget).after(addition)
                $('button.savestep').on('click', e => {
                  let input = $('.clicktype').val()
                  let saveString = `click:${input}`
                  $(e.currentTarget).closest('.li').replaceWith(`<div class="li" draggable="true">${saveString}<button class="del">&#10006;</button></div>`)
                }).off('keydown').on('keydown', (e) => {
                  if (e.keyCode === 13 || e.keyCode === 32) {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                })
              } else if (val === 'move') {
                let addition = `<div class="moveinputs"><input type="text" placeholder="x" class="screenx"><input type="text" placeholder="y" class="screeny"><button class="savestep">Add</button></div>`
                $(e.currentTarget).closest('.li').children().not('.del, .type').remove()
                $(e.currentTarget).after(addition)
                $('button.savestep').on('click', e => {
                  let input1 = $('.screenx').val()
                  let input2 = $('.screeny').val()
                  if (!input1 || input1.length < 1 || !input2 || input2.length < 1) return
                  let saveString = `move:${input1},${input2}`
                  $(e.currentTarget).closest('.li').replaceWith(`<div class="li" draggable="true">${saveString}<button class="del">&#10006;</button></div>`)
                }).off('keydown').on('keydown', (e) => {
                  if (e.keyCode === 13 || e.keyCode === 32) {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                })
              } else if (val === 'delay') {
                let addition = `<div class="delayinputs"><input min="50" max="3600000" step="10" type="number" placeholder="Delay (ms)" class="delay"><button class="savestep">Add</button></div>`
                $(e.currentTarget).closest('.li').children().not('.del, .type').remove()
                $(e.currentTarget).after(addition)
                $('button.savestep').on('click', e => {
                  let input = $('.delay').val()

                  if (!input) return
                  if (input < 50) input = 50
                  if (input > 3600000) input = 3600000

                  let saveString = `delay:${input}`
                  $(e.currentTarget).closest('.li').replaceWith(`<div class="li" draggable="true">${saveString}<button class="del">&#10006;</button></div>`)
                }).off('keydown').on('keydown', (e) => {
                  if (e.keyCode === 13 || e.keyCode === 32) {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                })
              } else if (val === 'repeat') {
                let addition = `<div class="repeatinputs"><input min="1" max="999" step="1" type="number" placeholder="Count" class="repeat"><button class="savestep">Add</button></div>`
                $(e.currentTarget).closest('.li').children().not('.del, .type').remove()
                $(e.currentTarget).after(addition)
                $('button.savestep').on('click', e => {
                  let input = $('.repeat').val()

                  if (!input) return
                  if (input < 1) input = 1
                  if (input > 999) input = 999

                  let saveString = `repeat:${input}`
                  if ($(e.currentTarget).closest('.collection').find(':contains(repeat)')[0]) return
                  $(e.currentTarget).closest('.li').replaceWith(`<div class="li" draggable="true">${saveString}<button class="del">&#10006;</button></div>`)
                }).off('keydown').on('keydown', (e) => {
                  if (e.keyCode === 13 || e.keyCode === 32) {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                })
              } else if (val === 'press') {
                let keys = ['backspace', 'delete', 'enter', 'tab', 'escape', 'up', 'down', 'right', 'left', 'home', 'end', 'pageup', 'pagedown', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'command', 'alt', 'control', 'shift', 'right_shift', 'space', 'printscreen', 'insert', 'audio_mute', 'audio_vol_down', 'audio_vol_up', 'audio_play', 'audio_stop', 'audio_pause', 'audio_prev', 'audio_next', 'audio_rewind', 'audio_forward', 'audio_repeat', 'audio_random', 'numpad_0', 'numpad_1', 'numpad_2', 'numpad_3', 'numpad_4', 'numpad_5', 'numpad_6', 'numpad_7', 'numpad_8', 'numpad_9', 'lights_mon_up', 'lights_mon_down', 'lights_kbd_toggle', 'lights_kbd_up', 'lights_kbd_down']
                let keysOptions = ''
                keys.forEach(key => {
                  keysOptions += `<option value="${key}">${key}</option>`
                })
                let addition = `<select class="presskey">${keysOptions}</select><button class="savestep">Add</button>`

                $(e.currentTarget).closest('.li').children().not('.del, .type').remove()
                $(e.currentTarget).after(addition)
                $('button.savestep').on('click', e => {
                  let input = $('.presskey').val()
                  let saveString = `press:${input}`
                  $(e.currentTarget).closest('.li').replaceWith(`<div class="li" draggable="true">${saveString}<button class="del">&#10006;</button></div>`)
                }).off('keydown').on('keydown', (e) => {
                  if (e.keyCode === 13 || e.keyCode === 32) {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                })
              } else if (val === 'null') {
                $(e.currentTarget).closest('.li').children().not('.del, .type').remove()
              }
            })
          }).off('keydown').on('keydown', (e) => {
            if (e.keyCode === 13 || e.keyCode === 32) {
              e.preventDefault()
              e.currentTarget.click()
            }
          })
        }).off('keydown').on('keydown', (e) => {
          if (e.keyCode === 13 || e.keyCode === 32) {
            e.preventDefault()
            e.currentTarget.click()
          }
        })

        let modal = `<div class="modalbg"><div class="modal" routine-name="${pair[0]}"><div class="header"><h2>${pair[0]}</h2><div class="buttons"><div class="buttons"><button class="plus" aria-label="Add Step">&#10133;</button><button class="save" aria-label="Save Routine">&#128190;</button><button class="trash" aria-label="Delete Routine">🗑️</button><button class="x" aria-label="Close Routine Edit Modal">&#10060;</button></div></div></div><div class="modal__content"><div class="collection">%coll%</div></div></div></div>`
        modal = modal.replace('%coll%', '<div class="li" draggable="true">' + JSON.parse(pair[1]).join('<button class="del">&#10006;</button></div><div class="li" draggable="true">') + '<button class="del">&#10006;</button></div>')

        window.data[pair[0]] =  {
          modal,
          data: JSON.parse(pair[1])
        }
      })
    }
  }
}

setup()