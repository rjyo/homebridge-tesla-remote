import tesla from 'teslams'
import util from 'util'

export default function createTesla({ Service, Characteristic }) {
  const CurrentTemperature = Characteristic.CurrentTemperature
  const LockCurrentState = Characteristic.LockCurrentState
  const LockTargetState = Characteristic.LockTargetState
  const SwitchOn = Characteristic.On

  return class Tesla {
    constructor(log, config) {
      this.log = log
      this.name = config.name
      this.token = config.token
      this.vin = config.vin
      this.temperature = 0
      this.tempSetting = 0
      this.climateState = Characteristic.TargetHeatingCoolingState.OFF
      this.chargeState = false
      this.batteryLevel = 0

      this.temperatureService = new Service.Thermostat(this.name)
      this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', this.getClimateState.bind(this, 'temperature'))
      this.temperatureService.getCharacteristic(Characteristic.TargetTemperature)
        .on('get', this.getClimateState.bind(this, 'setting'))
        .on('set', this.setTargetTemperature.bind(this))
      this.temperatureService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .on('get', this.getClimateState.bind(this, 'state'))
        .on('set', this.setClimateOn.bind(this))
      this.temperatureService.getCharacteristic(Characteristic.TemperatureDisplayUnits)
        .on('get', (callback) => {
          this.log('Getting temperature display units...')
          callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT)
        })

      this.lockService = new Service.LockMechanism(this.name)
      this.lockService.getCharacteristic(LockCurrentState)
        .on('get', this.getLockState.bind(this))

      this.lockService.getCharacteristic(LockTargetState)
        .on('get', this.getLockState.bind(this))
        .on('set', this.setLockState.bind(this))

      this.batteryLevelService = new Service.BatteryService(this.name)
      this.batteryLevelService.getCharacteristic(Characteristic.BatteryLevel)
        .on('get', this.getBatteryLevel.bind(this))

      this.chargingService = new Service.Switch(this.name + ' Charging', 'charging')
      this.chargingService.getCharacteristic(Characteristic.On)
        .on('get', this.isCharging.bind(this))
        .on('set', this.setCharging.bind(this))
    }

    getBatteryLevel(callback) {
      this.log('Getting currenting battery level...')

      this.getID((err, id) => {
        if (err) return callback(err)

        tesla.get_charge_state(id, (cs) => {
          if (cs && cs.battery_level) {
            this.batteryLevel = cs.battery_level
          } else {
            this.log('Error getting battery level: ' + util.inspect(arguments))
            return callback(new Error('Error getting battery level.'))
          }

          return callback(null, this.batteryLevel)
        })
      })
    }

    isCharging(callback) {
      this.log('Getting current charging state...')

      this.getID((err, id) => {
        if (err) return callback(err)

        tesla.get_charge_state(id, (state) => {
          if (state) {
            this.chargeState = ((state.charge_rate > 0) ? true : false)
          } else {
            this.log('Error getting charging state: ' + util.inspect(arguments))
            return callback(new Error('Error getting charging state.'))
          }

          return callback(null, this.chargeState)
        })
      })
    }

    setCharging(on, callback) {
      this.log('Setting charging to on = ' + on)
      this.getID((err, id) => {
        if (err) return callback(err)

        const charge = on ? 'on' : 'off'

        tesla.charge_state({id:id, charge}, (response) => {
          if (response.result == true) {
            if (on) {
              this.log('Car started charging')
            } else {
              this.log('Car stopped charging')
            }
            callback() // success
          } else if (response.reason === 'not_charging') {
            this.log('Not charging')
            callback(new Error('Not charging.'))
          } else if (response.reason === 'complete') {
            this.log('Charging already complete')
            callback(new Error('Charging already complete.'))
          } else {
            this.log('Error setting charging state: ' + util.inspect(response))
            callback(new Error('Error setting charging state.'))
          }
        })
      })
    }

    setTargetTemperature(value, callback) {
      this.log('Setting temperator to = ' + on)
      this.getID((err, id) => {
        if (err) return callback(err)

        tesla.set_temperature({id:id, value, value}, (response) => {
          if (response.result == true) {
            this.log('Setting temperature to ' + value)
            callback() // success
          } else {
            this.log('Error setting temperature: ' + util.inspect(response))
            callback(new Error('Error setting temperature.'))
          }
        })
      })
    }

    getClimateState(what, callback) {
      this.log("Getting current climate state...")

      this.getID((err, id) => {
        if (err) return callback(err)

        tesla.get_climate_state(id, (state) => {
          if (state && state.inside_temp) {
            this.temperature = state.inside_temp
            this.tempSetting = state.driver_temp_setting
            this.climateState = state.is_auto_conditioning_on ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.OFF
          } else {
            this.log("Error getting climate state: " + util.inspect(arguments))
            callback(new Error("Error getting climate state."))
          }

          switch (what) {
            case 'temperature': return callback(null, this.temperature)
            case 'setting': return callback(null, this.tempSetting)
            case 'state': return callback(null, this.climateState)
          }
        })
      })
    }

    setClimateOn(state, callback) {
      const climateState = state === Characteristic.TargetHeatingCoolingState.OFF ? 'stop' : 'start'
      this.log("Setting climate to = " + climateState)
      this.getID((err, id) => {
        if (err) return callback(err)

        tesla.auto_conditioning({id:id, climate: climateState}, (response) => {
          if (response.result == true) {
            this.log("Car climate state = " + climateState)
            callback(null) // success
          } else {
            this.log("Error setting climate state: " + util.inspect(arguments))
            callback(new Error("Error setting climate state."))
          }
        })
      })
    }

    getLockState(callback) {
      this.log("Getting current lock state...")

      this.getID(function(err, id) {
        if (err) return callback(err)

        tesla.get_vehicle_state(id, function(state) {
          callback(null, state.locked)
        })
      })
    }

    setLockState(state, callback) {
      var locked = (state == LockTargetState.SECURED)
      this.log("Setting car to locked = " + locked)
      this.getID((err, id) => {
        if (err) return callback(err)

        tesla.door_lock({id: id, lock: locked}, (response) => {
          if (response.result == true) {
            this.log("Car is now locked = " + locked)

            // we succeeded, so update the "current" state as well
            var currentState = (state == LockTargetState.SECURED) ?
              LockCurrentState.SECURED : LockCurrentState.UNSECURED

            // We need to update the current state "later" because Siri can't
            // handle receiving the change event inside the same "set target state"
            // response.
            setTimeout(function() {
              this.lockService.setCharacteristic(LockCurrentState, currentState)
            }.bind(this), 1)

            callback(null) // success
          } else {
            this.log("Error setting lock state: " + util.inspect(arguments))
            callback(new Error("Error setting lock state."))
          }
        })
      })
    }

    // Get the ID of the vehicle in your account with the desired VIN.
    getID(callback) {
      this.log("Logging into Tesla...")

      tesla.all({token: this.token}, (err, response, body) => {
        if (err) {
          this.log("Error logging into Tesla: " + err)
          return callback(err)
        }

        const vehicles = JSON.parse(body).response;

        for (let vehicle of vehicles) {
          if (vehicle.vin == this.vin) {
            return callback(null, vehicle.id_s)
          }
        }

        this.log("No vehicles were found matching the VIN '"+this.vin+"' entered in your config.json. Available vehicles:")
        for (let vehicle of vehicles) {
          this.log("VIN: " + vehicle.vin + " Name: " + vehicle.display_name)
        }
        callback(new Error("Vehicle with VIN " + this.vin + " not found."))
      })
    }

    getServices() {
      return [this.temperatureService, this.lockService, this.batteryLevelService, this.chargingService]
    }
  }
}
