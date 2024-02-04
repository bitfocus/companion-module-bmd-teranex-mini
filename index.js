// BlackMagic Design Teranex Mini

const { InstanceBase, InstanceStatus, runEntrypoint } = require('@companion-module/base')
const UpgradeScripts = require('./src/upgrades')

const config = require('./src/config')
const model = require('./src/model')
const utils = require('./src/utils')

class teranexMiniInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// Assign the methods from the listed files to this class
		Object.assign(this, {
			...config,
			...model,
			...utils,
		})

		this.data = {}

		this.stash = []
		this.command = null
	}

	async destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy()
		}
	}

	async init(config) {
		this.configUpdated(config)
	}

	async configUpdated(config) {
		this.config = config

		this.updateStatus(InstanceStatus.Connecting)

		this.initTCP()
	}
}

runEntrypoint(teranexMiniInstance, UpgradeScripts)
