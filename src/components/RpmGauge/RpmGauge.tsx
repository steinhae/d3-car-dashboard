import { triggerAsyncId } from 'async_hooks';
import { range } from 'd3-array';
import { easeCubicInOut } from 'd3-ease';
import { scaleLinear } from 'd3-scale';
import { select, Selection } from 'd3-selection';
import { arc, line } from 'd3-shape';
import { transition } from 'd3-transition';
import * as React from 'react';

interface IRpmGaugeProps {
  rpm: number;
  gear: string;
  temp: number;
}

export class RpmGauge extends React.Component<IRpmGaugeProps> {
  private needle: Selection<SVGPathElement, number[][], HTMLElement, any>;
  private gearText: Selection<SVGTextElement, unknown, HTMLElement, any>;
  private tempText: Selection<SVGTextElement, unknown, HTMLElement, any>;

  public componentDidMount() {
    this.generate();
  }

  public componentDidUpdate() {
    this.setRpm(this.props.rpm, 20);
    this.setGear(this.props.gear);
    this.setTemp(this.props.temp);
  }

  public render() {
    return <div className="rpm-gauge"></div>;
  }

  private generate() {
    const el = select('.rpm-gauge');
    const svg = el.append('svg').attr('width', '100%').attr('height', '100%');
    const g = svg.append('g').attr('transform', `translate(200, 200)`);
    const colors = ['#D1D1D1', '#AFAFAF', '#FFFFFF', '#FD3104', '#171717', '#0A0A0A'];
    const ticksData = [
      { rpm: 0 },
      { rpm: 10 },
      { rpm: 20 },
      { rpm: 30 },
      { rpm: 40 },
      { rpm: 50 },
      { rpm: 60 },
      { rpm: 70 },
      { rpm: 80 },
      { rpm: 90 }
    ];
    const r = 200; // width / 2

    // gradients
    const defs = svg.append('defs');

    const gradient = defs
      .append('linearGradient')
      .attr('id', 'gradient1')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '50%')
      .attr('y2', '100%');
    gradient.append('stop').attr('offset', '50%').attr('stop-color', colors[4]).attr('stop-opacity', 1);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', colors[5]).attr('stop-opacity', 1);

    // outer circle
    const outerRadius = r - 10;
    const innerRadius = 0;

    const circle = arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(0)
      .endAngle(2 * Math.PI);

    g.append('path')
      .attr('d', circle)
      .attr('fill', 'url(#gradient1)')
      .attr('stroke', colors[1])
      .attr('stroke-width', '5');

    // ticks
    const lg = svg.append('g').attr('class', 'label').attr('transform', `translate(${r}, ${r})`);
    const minAngle = -160;
    const maxAngle = 90;
    const angleRange = maxAngle - minAngle;

    const ticks = ticksData
      .reduce((acc, curr, i) => {
        if (curr.rpm === 0) {
          return acc;
        } else {
          return acc.concat(range(curr.rpm - 10, curr.rpm + 10));
        }
      }, [])
      .filter((d: number) => d % 2 === 0 && d <= 90);

    lg.selectAll('line')
      .data(ticks)
      .enter()
      .append('line')
      .attr('class', 'tickline')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', (d: number) => (d % 5 === 0 ? '12' : '7'))
      .attr('transform', (d: number) => {
        const scale = scaleLinear().range([0, 1]).domain([0, 90]);
        const ratio = scale(d);
        const newAngle = minAngle + ratio * angleRange;
        const deviation = d % 5 === 0 ? 12 : 17;
        return `rotate(${newAngle}) translate(0, ${deviation - r})`;
      })
      .style('stroke', (d: number) => (d >= 80 ? colors[3] : colors[2]))
      .style('stroke-width', (d: number) => (d % 5 === 0 ? '3' : '1'));

    // tick texts
    lg.selectAll('text')
      .data(ticksData)
      .enter()
      .append('text')
      .attr('transform', (d: { rpm: number }) => {
        const scale = scaleLinear().range([0, 1]).domain([0, 90]);
        const ratio = scale(d.rpm);
        const newAngle = this.degToRad(minAngle + ratio * angleRange);
        const y = (55 - r) * Math.cos(newAngle);
        const x = -1 * (52 - r) * Math.sin(newAngle);
        return `translate(${x}, ${y + 7})`;
      })
      .text((d: { rpm: number }) => (d.rpm !== 0 ? d.rpm / 10 : ''))
      .attr('fill', (d: { rpm: number }) => (d.rpm >= 80 ? colors[3] : colors[2]))
      .attr('font-size', '30')
      .attr('text-anchor', 'middle');

    // needle
    const pointerHeadLength = r * 0.88;
    const lineData = [
      [0, -pointerHeadLength],
      [0, 15]
    ];
    const needleLine = line();
    const ng = svg
      .append('g')
      .data([lineData])
      .attr('class', 'pointer')
      .attr('stroke', colors[3])
      .attr('stroke-width', '6')
      .attr('stroke-linecap', 'round')
      .attr('transform', `translate(${r}, ${r})`)
      .attr('z-index', '1');

    this.needle = ng.append('path').attr('d', needleLine as any).attr('transform', `rotate(${-160})`);

    // inner circle
    const tg = svg.append('g').attr('transform', `translate(${r}, ${r})`);

    const innerArcOuterRadius = r - 80;
    const innerArcInnerRadius = 0;

    const innerArc = arc()
      .innerRadius(innerArcInnerRadius)
      .outerRadius(innerArcOuterRadius)
      .startAngle(0)
      .endAngle(2 * Math.PI);

    tg.append('path')
      .attr('d', innerArc)
      .attr('stroke', colors[0])
      .attr('stroke-width', '2')
      .attr('fill', 'url(#gradient1)')
      .attr('z-index', '10');

    // big text in center
    this.gearText = tg.append('text')
      .text("1")
      .attr('font-size', '80')
      .attr('text-anchor', 'middle')
      .attr('fill', colors[2])
      .attr('x', '0')
      .attr('y', '25px')
      .style('position', 'absolute')
      .style('z-index', '10');

    tg.append('text' )
    .text('1/min x 1000')
    .attr('font-size', '14')
    .attr('text-anchor', 'middle')
    .attr('fill', colors[2])
    .attr('x', '0')
    .attr('y', '85px')
    .style('position', 'absolute')
    .style('z-index', '10');

    // rpm x 1000 text
   
    // lights icon
    tg.append('image')
      .attr('xlink:href', './images/lights.svg')
      .attr('x', '10px')
      .attr('y', '134px')
      .attr('width', '35px')
      .attr('height', '35px');

    // seat belt icon
    tg.append('image')
      .attr('xlink:href', './images/seat-belt.svg')
      .attr('x', '56px')
      .attr('y', '120px')
      .attr('width', '30px')
      .attr('height', '30px');

    // rear window defrost icon
    tg.append('image')
      .attr('xlink:href', './images/rear-window-defrost.svg')
      .attr('x', '95px')
      .attr('y', '95px')
      .attr('width', '30px')
      .attr('height', '30px');


    // temp text
    this.tempText = tg.append('text')
    .text('50')
    .attr('font-size', '32')
    // .attr('text-anchor', 'middle')
    .attr('fill', colors[2])
    .attr('x', '122px')
    .attr('y', '70px')
    // .style('position', 'absolute')
    .style('z-index', '10');
      
  }

  private degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private scale(value: number) {
    const s = scaleLinear().range([0, 1]).domain([0, 9000]);
    return s(value);
  }

  private setRpm(rpm: number, duration: number) {
    const minAngle = -160;
    const maxAngle = 90;
    const angleRange = maxAngle - minAngle;
    const angle = minAngle + this.scale(rpm) * angleRange;

    
    transition
      .call(this.needle)
      .select(() => this.needle.node())
      .duration(duration)
      .ease(easeCubicInOut)
      .attr('transform', `rotate(${angle})`);
  }

  private setGear(gear: string) {
    if (gear == "0") {
      gear = "N"
    }
    transition
    .call(this.gearText)
    .select(() => this.gearText.node())
    // .attr('fill', color)
    .text(gear)
  }

  private setTemp(temp: number) {
    transition
    .call(this.tempText)
    .select(() => this.tempText.node())
    // .attr('fill', color)
    .text(temp)
  }
}
