const { TCPHelper, InstanceStatus } = require('@companion-module/base')

const cloneDeep = require('clone-deep')

module.exports = {
	commandValueToKey: function (text) {
		let self = this

		self.log('debug', 'Started with: |' + text + '|')
		let newText = text
		newText = newText.replaceAll(' ', '_').toLowerCase()
		newText = newText.replaceAll('/', '_').toLowerCase()
		newText = newText.replaceAll('-', '_').toLowerCase()
		self.log('debug', 'Ended with: |' + newText + '|')
		return newText
	},

	parseIpAndPort: function () {
		let self = this
		// TODO: Switch to Regex.IP when we can convert that into a RegExp object... (it will need some processing)
		const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

		if (this.config.bonjourHost) {
			const [ip, rawPort] = this.config.bonjourHost.split(':')
			const port = Number(rawPort)
			if (ip.match(ipRegex) && !isNaN(port)) {
				return {
					ip,
					port,
				}
			}
		} else if (this.config.host) {
			if (this.config.host.match(ipRegex)) {
				return {
					ip: this.config.host,
					port: undefined,
				}
			}
		}
		return null
	},

	initTCP: function () {
		let self = this
		let receivebuffer = ''

		self.inited_model = false
		self.variables = []
		self.variableValues = {}
		self.variables.push({ name: 'Connection Status', variableId: 'connect_status' })
		// Make the connect status variable immediately available...
		self.setVariableDefinitions(self.variables)

		self.actions = {}

		self.feedbacks = {}

		self.presets = {}

		let target = self.parseIpAndPort()

		if (self.socket !== undefined) {
			self.setVariableValues({ connect_status: 'Disconnected' })
			self.socket.destroy()
			delete self.socket
		}

		if (target && target.port === undefined) {
			self.log('info', 'Setting port to default')
			target.port = 9995
		}

		self.has_data = false

		if (target && target.ip) {
			self.socket = new TCPHelper(target.ip, target.port)

			self.socket.on('error', function (err) {
				self.log('error', 'Network error: ' + err.message)
				self.socket.destroy()
				delete self.socket
				self.setVariableValues({ connect_status: 'Disconnected' })
				self.log('info', 'Retrying connection in 10 seconds...')
				setTimeout(self.initTCP.bind(self), 10000) //retry after 10 seconds
			})

			self.socket.on('connect', function () {
				self.setVariableValues({ connect_status: 'Connected' })
				self.updateStatus(InstanceStatus.Ok)
			})

			// separate buffered stream into lines with responses
			self.socket.on('data', function (chunk) {
				let i = 0,
					line = '',
					offset = 0
				receivebuffer += chunk

				while ((i = receivebuffer.indexOf('\n', offset)) !== -1) {
					line = receivebuffer.substr(offset, i - offset)
					offset = i + 1
					self.socket.emit('receiveline', line.toString())
				}

				receivebuffer = receivebuffer.substr(offset)
			})

			self.socket.on('receiveline', function (line) {
				if (self.command === null && line.match(/:/)) {
					self.command = line
				} else if (self.command !== null && line.length > 0) {
					self.stash.push(line.trim())
				} else if (line.length === 0 && self.command !== null) {
					let cmd = self.command.trim().split(/:/)[0]

					if (self.config.debug) {
						self.log('debug', 'COMMAND: ' + cmd)
					}

					let obj = {}
					self.stash.forEach(function (val) {
						// Deal with some inconsistent colon placement in the BMD protocol
						let fixedVal = val
						fixedVal = fixedVal.replace('Gain: XLR Analog Left', 'Gain XLR Analog Left:')
						fixedVal = fixedVal.replace('Gain: XLR Analog Right', 'Gain XLR Analog Right:')
						fixedVal = fixedVal.replace('Assign: XLR Analog Stereo SDI Stereo', 'Assign XLR Analog Stereo SDI Stereo:')
						fixedVal = fixedVal.replace('Bypass: XLR Analog Left', 'Bypass XLR Analog Left:')
						fixedVal = fixedVal.replace('Bypass: XLR Analog Right', 'Bypass XLR Analog Right:')
						fixedVal = fixedVal.replace('Gain: XLR AES/EBU Stereo 1-2', 'Gain XLR AES/EBU Stereo 1-2:')
						fixedVal = fixedVal.replace('Gain: XLR AES/EBU Stereo 3-4', 'Gain XLR AES/EBU Stereo 3-4:')
						fixedVal = fixedVal.replace('Assign: XLR AES/EBU Quad SDI Quad', 'Assign XLR AES/EBU Quad SDI Quad:')
						fixedVal = fixedVal.replace('Bypass: XLR AES/EBU Stereo 1-2', 'Bypass XLR AES/EBU Stereo 1-2:')
						fixedVal = fixedVal.replace('Bypass: XLR AES/EBU Stereo 3-4', 'Bypass XLR AES/EBU Stereo 3-4:')
						fixedVal = fixedVal.replace('Routing: XLR AES/EBU Quad SDI Quad', 'Routing XLR AES/EBU Quad SDI Quad:')
						fixedVal = fixedVal.replace('Assign: HDMI Oct SDI Oct', 'Assign HDMI Oct SDI Oct:')
						fixedVal = fixedVal.replace('Routing: HDMI Oct SDI Oct', 'Routing HDMI Oct SDI Oct:')

						let info = fixedVal.split(/\s*:\s*/)
						obj[info.shift()] = info.join(':')
					})

					self.log('debug', JSON.stringify(obj))
					self.teranexMiniInformation(cmd, obj)

					self.stash = []
					self.command = null
				} else {
					if (self.config.debug) {
						self.log('debug', 'Unexpected response from Teranex Mini: ' + line)
					}
				}
			})
		} else {
			self.log('error', "Didn't get a target to connect to")
			self.updateStatus(InstanceStatus.Disconnected)
		}
	},

	sendCommand: function (cmd) {
		let self = this

		if (self.socket !== undefined && self.socket.isConnected) {
			if (self.config.debug) {
				self.log('debug', 'SENDING COMMAND: ' + cmd)
			}
			self.socket.send(cmd)
		} else {
			self.log('error', 'Socket not connected :(')
		}
	},

	teranexMiniInformation: function (key, data) {
		let self = this

		let processedCommand = self.commandValueToKey(key)
		self.log('debug', 'Got key: ' + processedCommand)

		let model = self.getModel()
		self.log('debug', 'Model data: ' + JSON.stringify(model))

		if (processedCommand in model) {
			self.log('debug', 'Found model data for: ' + processedCommand)
			self.log('debug', JSON.stringify(model[processedCommand]))
			for (const [k, v] of Object.entries(data)) {
				self.log('debug', `${k}: ${v}`)
				let processedK = self.commandValueToKey(k)
				let commandKey = processedCommand + '-' + processedK
				self.log('debug', 'Generated commandKey: ' + commandKey)
				self.data[commandKey] = v
				if (processedK in model[processedCommand]) {
					self.log('info', 'Found model data for: ' + processedCommand + ' - ' + processedK)
					self.log('debug', JSON.stringify(model[processedCommand][processedK]))

					// Init the model from the live data if we haven't already done so
					if (!self.inited_model) {
						if ('actions' in model[processedCommand][processedK]) {
							model[processedCommand][processedK]['actions'].forEach((action, i) => {
								let id = commandKey
								if (i > 0) {
									id += '-' + i
								}
								if (!('options' in action) && 'options' in model[processedCommand][processedK]) {
									action['options'] = model[processedCommand][processedK]['options']
								}
								self.actions[id] = action
							})
						}

						if ('feedbacks' in model[processedCommand][processedK]) {
							model[processedCommand][processedK]['feedbacks'].forEach((feedback, i) => {
								let id = commandKey
								if (i > 0) {
									id += '-' + i
								}
								if (!('options' in feedback) && 'options' in model[processedCommand][processedK]) {
									feedback['options'] = model[processedCommand][processedK]['options']
								}
								self.feedbacks[id] = feedback
							})
						}

						if ('presets' in model[processedCommand][processedK]) {
							model[processedCommand][processedK]['presets'].forEach((preset, i) => {
								let id = commandKey
								if (i > 0) {
									id += '-' + i
								}
								if (
									'options' in model[processedCommand][processedK] &&
									model[processedCommand][processedK]['options'].length > 0
								) {
									if (
										'choices' in model[processedCommand][processedK]['options'][0] &&
										model[processedCommand][processedK]['options'][0]['choices'].length > 0
									) {
										let option = model[processedCommand][processedK]['options'][0]
										option['choices'].forEach((choice, j) => {
											let presetId = id + '-' + choice['id']
											self.log('debug', 'Looking at choice ' + choice['label'])
											self.presets[presetId] = cloneDeep(preset)
											self.presets[presetId]['name'] += choice['label']
											self.presets[presetId]['style']['text'] = choice['label']
											self.presets[presetId]['steps'][0]['down'][0]['options'][option['id']] = choice['id']
											self.presets[presetId]['feedbacks'][0]['options'][option['id']] = choice['id']
										})
									}
								}
							})
						}
					}

					if ('variables' in model[processedCommand][processedK]) {
						model[processedCommand][processedK]['variables'].forEach((variable, i) => {
							let id = commandKey
							if (i > 0) {
								id += '-' + i
							}

							// Init the variables from the live data if we haven't already done so
							if (!self.inited_model) {
								self.variables.push({ name: variable['name'], variableId: id })
							}

							// TODO(Peter): Should we parse some of these values as int/bool etc?
							self.variableValues[id] = v
						})
					}
				} else {
					self.log('warn', 'Failed to find model data for: ' + processedK)
				}
			}
		} else {
			self.log('warn', 'Failed to find model data for: ' + processedCommand)
		}

		if (key == 'END PRELUDE') {
			self.setActionDefinitions(self.actions)
			self.setFeedbackDefinitions(self.feedbacks)
			self.setPresetDefinitions(self.presets)
			self.setVariableDefinitions(self.variables)
			self.log('info', 'Inited model data')
			self.inited_model = true
			self.log('debug', 'Local data: ' + JSON.stringify(self.data))
		}

		if (self.inited_model) {
			// Update variable info immediately once the variables themselves have been set
			// TODO(Peter): We can probably empty the variables after this so we only re-send the changed ones next time
			// As long as the feedbacks use the internal data model not the variables
			self.setVariableValues(self.variableValues)

			self.checkFeedbacks()
		}
	},
}
