import * as React from 'react';
import { fromEvent, interval, Subscription } from 'rxjs';
import { filter, timeInterval } from 'rxjs/operators';

import { InfoBottom } from '../InfoBottom/InfoBottom';
import { InfoMap } from '../InfoMap/InfoMap';
import { InfoTop } from '../InfoTop/InfoTop';
import { RpmGauge } from '../RpmGauge/RpmGauge';
import { SpeedGauge } from '../SpeedGauge/SpeedGauge';

const RPI_HOST = "192.168.0.69:8000"
const DEBUG_HOST = "test.mosquitto.org:8081"

const mqtt = require('mqtt')
const client  = mqtt.connect('ws://' + RPI_HOST)

client.on('connect', function () {
  client.subscribe('husq/#', function (err) {
    if (!err) {
      client.publish('husq/status', 'client_connected')
    }
  })
})
interface IDashboardState {
  acc: boolean;
  rpm: number;
  gear: string;
  speed: number;
  temp: number;
}

export class Dashboard extends React.Component<{}, IDashboardState> {
  private subs: Subscription;

  constructor(props: {}) {
    super(props);

    this.state = {
      acc: false,
      rpm: 0,
      speed: 0,
      gear: "-1",
      temp: 0
    };

    client.on('message', (topic, message) => {
      console.log(topic)
      if (topic == "husq/rpm") {
        if (Number(message)) {
          this.setState({ rpm: Number(message)});
        }
      }
      if (topic == "husq/gear") {
        this.setState({ gear: message});
      }
      if (topic == "husq/temp") {
        if (Number(message)) {
          this.setState({ temp: Number(message)});
        }
      }
    })
  }
  
  
  public componentDidMount() {

    // TODO: Create proper debug configuration by reading from env var
    let debug = false
    if (debug) {
        this.subs = new Subscription();

        const keyDown = fromEvent(document, 'keydown')
          .pipe(filter((e: KeyboardEvent) => e.which === 38))
          .subscribe(() => this.setState({ acc: true }));

        const keyUp = fromEvent(document, 'keyup')
          .pipe(filter((e: KeyboardEvent) => e.which === 38))
          .subscribe(() => this.setState({ acc: false }));


        const keyInterval = interval(10)
          .pipe(timeInterval())
          .subscribe(() => {
            if (this.state.acc) {
              if (this.state.speed < 300) {
                this.setState({ speed: this.state.speed + 1 });
              }
              if (this.state.rpm < 9000) {
                this.setState({ rpm: this.state.rpm + 50 });
              }
            } else {
              if (this.state.speed > 0) {
                this.setState({ speed: this.state.speed - 1 });
              }
              if (this.state.rpm > 0) {
                this.setState({ rpm: this.state.rpm - 50 });
              }
              if (this.state.rpm == 0) {
                this.setState({ gear: 0})
              }
            }
            let next_gear = parseInt(this.state.rpm / 1500)
            let temp = next_gear * 17
            this.setState({ gear: next_gear.toString()})
            this.setState({ temp: temp.toString()})
          });
          this.subs.add(keyDown).add(keyUp).add(keyInterval);\
      }

  }

  public componentWillUnmount() {
    this.subs.unsubscribe();
  }


  public render() {
    return (
      <div className="dashboard">
        <div className="dashboard-body">
          <div className="container">
            <RpmGauge rpm={this.state.rpm} gear={this.state.gear} temp={this.state.temp}/>
          </div>
        </div>
      </div>
    );
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.which === 38) {
      this.setState({ acc: true });
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.which === 38) {
      this.setState({ acc: false });
    }
  }

  
}
