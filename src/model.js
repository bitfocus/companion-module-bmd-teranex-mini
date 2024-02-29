const { combineRgb } = require('@companion-module/base')

module.exports = {
	getModel: function () {
		let self = this

		const foregroundColor = combineRgb(255, 255, 255) // White
		const backgroundColorRed = combineRgb(255, 0, 0) // Red
		const backgroundColorBlack = combineRgb(0, 0, 0) // Black

		return {
			teranex_mini_device: {
				model: {
					variables: [{ name: 'Model' }],
				},
				label: {
					variables: [{ name: 'Label' }],
				},
				number_of_luts: {
					variables: [{ name: 'LUTs' }],
				},
			},
			video_input: {
				digital_input: {
					options: [
						{
							type: 'dropdown',
							label: 'Digital Input',
							id: 'source',
							default: 'Auto',
							choices: [
								{ id: 'SDI', label: 'SDI' },
								{ id: 'Auto', label: 'Auto' },
							],
						},
					],
					actions: [
						{
							name: 'Set digital input',
							callback: function (action, bank) {
								cmd = 'VIDEO INPUT:\nDigital Input:' + action.options.source + '\n\n'
								self.sendCommand(cmd)
							},
						},
					],
					feedbacks: [
						{
							type: 'boolean',
							name: 'Digital input: Change background color',
							description: 'If the input specified is the active digital input, change colors of the bank',
							defaultStyle: {
								color: foregroundColor,
								bgcolor: backgroundColorRed,
							},
							callback: async function (feedback, bank) {
								return self.data['video_input-digital_input'] === feedback.options.source
							},
						},
					],

					presets: [
						{
							type: 'button',
							category: 'Digital Input',
							name: 'Change digital input to ',
							style: {
								size: 'auto',
								color: foregroundColor,
								bgcolor: backgroundColorBlack,
							},
							steps: [
								{
									down: [
										{
											actionId: 'video_input-digital_input',
											options: {},
										},
									],
									up: [],
								},
							],
							feedbacks: [
								{
									feedbackId: 'video_input-digital_input',
									options: {},
									style: {
										color: foregroundColor,
										bgcolor: backgroundColorRed,
									},
								},
							],
						},
					],
					variables: [{ name: 'Digital Input' }],
				},
				up_conversion_mode: {
					variables: [{ name: 'Up conversion mode' }],
				},
				frame_rate_conversion: {
					variables: [{ name: 'Frame rate conversion' }],
				},
				multiplex_level: {
					variables: [{ name: 'Multiplex level' }],
				},
			},
			audio_input: {
				sample_rate_conversion: {
					variables: [{ name: 'Sample rate conversion' }],
				},
				swap_channels_3_and_4: {
					variables: [{ name: 'Swap channels 3 and 4' }],
				},
				xlr_format: {
					variables: [{ name: 'XLR Format' }],
				},
				timecode_enabled: {
					variables: [{ name: 'Timecode enabled' }],
				},
				gain_xlr_analog_left: {
					variables: [{ name: 'Gain XLR Analog Left' }],
				},
				gain_xlr_analog_right: {
					variables: [{ name: 'Gain XLR Analog Right' }],
				},
				assign_xlr_analog_stereo_sdi_stereo: {
					variables: [{ name: 'Assign XLR Analog Stereo SDI Stereo' }],
				},
				bypass_xlr_analog_left: {
					variables: [{ name: 'Bypass XLR Analog Left' }],
				},
				bypass_xlr_analog_right: {
					variables: [{ name: 'Bypass XLR Analog Right' }],
				},
				gain_xlr_aes_ebu_stereo_1_2: {
					variables: [{ name: 'Gain XLR AES/EBU Stereo 1-2' }],
				},
				gain_xlr_aes_ebu_stereo_3_4: {
					variables: [{ name: 'Gain XLR AES/EBU Stereo 3-4' }],
				},
				assign_xlr_aes_ebu_quad_sdi_quad: {
					variables: [{ name: 'Assign XLR AES/EBU Quad SDI Quad' }],
				},
				assign_hdmi_oct_sdi_oct: {
					variables: [{ name: 'Assign HDMI Oct SDI Oct' }],
				},
			},
			audio_output: {
				xlr_format: {
					variables: [{ name: 'XLR Format' }],
				},
				gain_xlr_analog_left: {
					variables: [{ name: 'Gain XLR Analog Left' }],
				},
				gain_xlr_analog_right: {
					variables: [{ name: 'Gain XLR Analog Right' }],
				},
				gain_xlr_aes_ebu_stereo_1_2: {
					variables: [{ name: 'Gain XLR AES/EBU Stereo 1-2' }],
				},
				gain_xlr_aes_ebu_stereo_3_4: {
					variables: [{ name: 'Gain XLR AES/EBU Stereo 3-4' }],
				},
			},
		}
	},
}
