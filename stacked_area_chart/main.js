// colorLegend
const colorLegend = (selection, { colorScale, colorLegendLabel, types, onLegendDrag, width }) => {
  const dragBehavior = d3.drag()
    .on('start', function (event, d) {
      d3.select(this).raise().attr('font-weight', 'bold');
    })
    .on('drag', function (event, d) {
      d3.select(this).attr('y', event.y);
    })
    .on('end', function (event, d) {
      const yPos = event.y;
      const targetIndex = Math.max(0, Math.min(types.length - 1, Math.floor(yPos / 30)));
      const draggedIndex = types.indexOf(d);

      if (targetIndex !== draggedIndex) {
        const temp = types[draggedIndex];
        types[draggedIndex] = types[targetIndex];
        types[targetIndex] = temp;

        onLegendDrag(types);
      }

      d3.select(this).attr('font-weight', null);
      selection.call(updateLegend);
    });

  const colorLegendG = selection.selectAll('g.color-legend').data([null])
    .join('g')
    .attr('class', 'color-legend');

  colorLegendG.selectAll('text.color-legend-label')
    .data([null])
    .join('text')
    .attr('x', 25)
    .attr('y', 95)
    .attr('class', 'color-legend-label')
    .text(colorLegendLabel);

  const updateLegend = (legendSelection) => {
    const ticks = legendSelection.selectAll('g.tick').data(types, d => d);

    const enterTicks = ticks.enter()
      .append('g')
      .attr('class', 'tick')
      .call((selection) => {
        selection.append('circle');
        selection.append('text');
      })
      .merge(ticks)
      .attr('transform', (d, i) => `translate(20, ${120 + i * 30})`)
      .attr('font-size', 10)
      .call((selection) => {
        selection.select('circle')
          .attr('r', 10)
          .attr('cx', 0)
          .attr('fill', (d, i) => colorScale(i));
        selection.select('text')
          .attr('dy', '0.32em')
          .attr('x', 15)
          .text((d) => d)
          .call(dragBehavior);
      });

    ticks.exit().remove();
  };

  selection.call(updateLegend);
};

// themeRiver
const themeRiver = (selection, props) => {
  const { margin, width, height, data, colorLegendLabel, types, onLegendDrag } = props;

  selection.selectAll('*').remove();

  const innerWidth = width - margin.right - margin.left - 50;
  const innerHeight = height - margin.top - margin.bottom;

  const g = selection.selectAll('.container').data([null]);
  const gcontainer = g.enter().append('g').attr('class', 'container');
  gcontainer.merge(g).attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleTime()
    .domain(d3.extent(data, (d) => new Date(d.saledate)))
    .range([0, innerWidth]);

  const stackedData = d3.stack()
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetWiggle)
    .keys(types)(data);

  const yScale = d3.scaleLinear()
    .domain([
      d3.min(stackedData, (d) => d3.min(d, (d) => d[0])),
      d3.max(stackedData, (d) => d3.max(d, (d) => d[1]))
    ])
    .range([innerHeight, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(types)
    .range(['#264653', '#287271', '#2a9d8f', '#8ab17d', '#e9c46a', '#f4a261', '#e76f51']);

  selection.call(colorLegend, { colorScale, colorLegendLabel, types, onLegendDrag });

  const areaGenerator = d3.area()
    .x((d) => xScale(new Date(d.data.saledate)))
    .y0((d) => yScale(d[0]))
    .y1((d) => yScale(d[1] || d[0]));

  gcontainer.append('g').selectAll('path')
    .data(stackedData)
    .enter().append('path')
    .attr('class', 'area')
    .attr('d', areaGenerator)
    .attr('fill', (d) => colorScale(d.key));

  const xAxisTop = gcontainer.append('g')
    .attr('class', 'x-axis-top')
    .call(d3.axisTop(xScale).tickPadding(10).tickSizeOuter(0));

  const xAxisBottom = gcontainer.append('g')
    .attr('class', 'x-axis-bottom')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickPadding(10).tickSizeOuter(0));
};

// Main
const svg = d3.select('svg');
const width = +svg.attr('width');
const height = +svg.attr('height');

let data;
let types;

const render = () => {
  svg.call(themeRiver, {
    margin: { top: 30, right: 100, bottom: 70, left: 100 },
    width,
    height,
    data,
    colorLegendLabel: 'Type',
    types,
    onLegendDrag: (newTypes) => {
      types = newTypes;
      render();
    }
  });
};

d3.json('cumulative_percent.json').then((loadedData) => {
  types = Object.keys(loadedData[0]).filter(key => key !== 'saledate');

  data = loadedData.map((d) => {
    const parsedDate = new Date(d.saledate);
    return { ...d, saledate: parsedDate };
  });

  render();
});
