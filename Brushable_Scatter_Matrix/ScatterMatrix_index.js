d3.csv("112_Data_in_person_New.csv", (error, data) => {
    if (error) throw error;

    // Filter the data to include only the desired columns + grouping variable
    const filteredData = data.map(d => ({
        SearchTime_avg: +d['SearchTime_avg'],
        WorkTime_avg: +d['WorkTime_avg'],
        Search_R: +d['Search_R'],
        Work_R: +d['Work_R'],
        WorkingType: d['WorkingType'], // Keep the grouping variable
        Male: d['Male'], // Include Male variable
        Class: d['Class'], // Include Class variable
        Stat_expri: d['Stat_expri'] // Include  Stat_expri variable
    }));

    // Define variables for scatterplot matrix
    const traits = ["SearchTime_avg", "WorkTime_avg", "Search_R", "Work_R"];
    const domainByTrait = {};
    traits.forEach(trait => {
        domainByTrait[trait] = d3.extent(filteredData, d => d[trait]);
    });

    const n = traits.length;
    const size = 200;
    const padding = 45;

    const x = d3.scaleLinear().range([padding / 2, size - padding / 2]);
    const y = d3.scaleLinear().range([size - padding / 2, padding / 2]);

    // Define color scale
    const colorScale = d3.scaleOrdinal()
        .domain([...new Set(filteredData.map(d => d.WorkingType))]) // Initial domain
        .range(['#A7B2B7', '#C5CA8E', '#AC94A4']); // Adjust color palette

    // Initial grouping variable
    let currentGrouping = "WorkingType";

    // Main SVG container
    const svg = d3.select("#brushable_scatterplot_matrix").append("svg")
        .attr("width", size * n + padding)
        .attr("height", size * n + padding + 100)
        .append("g")
        .attr("transform", `translate(${padding / 2}, ${padding / 2 + 35})`);
    
    let brushCell;
        // Brush setup
    function brushstart(p) {
        if (brushCell !== this) {
            d3.select(brushCell).call(d3.brush().move, null);
            brushCell = this;
            x.domain(domainByTrait[p.x]);
            y.domain(domainByTrait[p.y]);
        }
    }

    function brushmove(p) {
        const e = d3.brushSelection(this);
        svg.selectAll("circle").classed("hidden", d => {
            if (!e) return false;
            return e[0][0] > x(d[p.x]) || x(d[p.x]) > e[1][0] || e[0][1] > y(d[p.y]) || y(d[p.y]) > e[1][1];
        });
    }

    function brushend() {
        const e = d3.brushSelection(this);
        if (e === null) svg.selectAll(".hidden").classed("hidden", false);
    }

    // Function to update scatterplot matrix and legend
    function updateChart(grouping) {

        // Update the color scale
        let uniqueGroups = [...new Set(filteredData.map(d => d[grouping]))];
    
        // Custom order for Class Level
        if (grouping === "Class") {
            const classOrder = ["Basic", "Intermediate", "Advanced"];
            uniqueGroups.sort((a, b) => classOrder.indexOf(a) - classOrder.indexOf(b));
        }

        colorScale.domain(uniqueGroups);

        // Update legend
        d3.select("#legend").selectAll("*").remove(); // Clear existing legend
        const legendContainer = d3.select('#legend')
            .append('svg')
            .attr('width', 600)
            .attr('height', uniqueGroups.length * 25)
            .attr('transform', 'translate(220, 0)'); // Move 50px to the right

        const legendItems = legendContainer.selectAll('.legend-item')
            .data(uniqueGroups)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 25})`);

        legendItems.append('circle')
            .attr('cx', 10)
            .attr('cy', 10)
            .attr('r', 6)
            .attr('fill', d => colorScale(d));

        legendItems.append('text')
            .attr('x', 25)
            .attr('y', 15)
            .text(d => d)
            .attr('fill', '#000')
            .attr('font-size', '14px')
            .attr('font-family', 'Arial');

        // Clear existing scatterplot cells
        svg.selectAll(".cell").remove();

        // Redraw scatterplot cells
        const cell = svg.selectAll(".cell")
            .data(cross(traits, traits))
            .enter().append("g")
            .attr("class", "cell")
            .attr("transform", d => `translate(${(n - d.i - 1) * size}, ${d.j * size})`)
            .each(plot);
        
        // Add brushing to cells
        cell.call(d3.brush()
            .on("start", brushstart)
            .on("brush", brushmove)
            .on("end", brushend)
            .extent([[0, 0], [size, size]]));

    }

    function plot(p) {
        const cell = d3.select(this);
    
        // Set the scale domains for the current trait
        x.domain(domainByTrait[p.x]);
        y.domain(domainByTrait[p.y]);
    
        // Draw the frame
        cell.append("rect")
            .attr("class", "frame")
            .attr("x", padding / 2)
            .attr("y", padding / 2)
            .attr("width", size - padding)
            .attr("height", size - padding);
    
        if (p.x !== p.y) {
            // Scatterplot for off-diagonal cells
            cell.selectAll("circle")
                .data(filteredData)
                .enter().append("circle")
                .attr("cx", d => x(d[p.x]))
                .attr("cy", d => y(d[p.y]))
                .attr("r", 4)
                .style("fill", d => colorScale(d[currentGrouping]));
    
            // Add X-axis to the scatter plot
            cell.append("g")
                .attr("transform", `translate(0, ${size - padding / 2})`)
                .attr("class", "x axis")
                .call(d3.axisBottom(x).ticks(4));
    
            // Add Y-axis to the scatter plot
            cell.append("g")
                .attr("transform", `translate(${padding / 2}, 0)`)
                .attr("class", "y axis")
                .call(d3.axisLeft(y).ticks(4));
        } else {
            // Histogram for diagonal cells
            const histogram = d3.histogram()
                .value(d => d[p.x])
                .domain(x.domain())
                .thresholds(x.ticks(15));
    
            const bins = histogram(filteredData);
    
            const yScale = d3.scaleLinear()
                .domain([0, d3.max(bins, d => d.length)])
                .range([size - padding, padding / 2]);
    
            cell.selectAll("rect")
                .data(bins)
                .enter().append("rect")
                .attr("x", d => x(d.x0) + 1)
                .attr("y", d => yScale(d.length))
                .attr("width", d => x(d.x1) - x(d.x0) - 1)
                .attr("height", d => size - padding - yScale(d.length))
                .style("fill", "#bbb");
    
            // Add variable name in diagonal cells
            const variableLabels = {
                SearchTime_avg: "Average Search Time (Sec)",
                WorkTime_avg: "Average Work Time (Sec)",
                Search_R: "Search Proportion",
                Work_R: "Work Proportion"
            };
    
            cell.append("text")
                .attr("x", size - padding / 2 - 10)
                .attr("y", padding / 2 + 10)
                .attr("text-anchor", "end")
                .attr("dy", ".35em")
                .attr("fill", "black")
                .style("font-size", "12px")
                .style("font-weight", "bold")
                .text(variableLabels[p.x]);
        }
    }


    
    // Helper functions for brushing
    function cross(a, b) {
        const c = [];
        for (let i = 0; i < a.length; i++) {
            for (let j = 0; j < b.length; j++) {
                c.push({ x: a[i], i, y: b[j], j });
            }
        }
        return c;
    }

    // Initialize the chart with the default grouping variable
    updateChart(currentGrouping);

    // Add event listener for the dropdown
    d3.select("#groupSelector").on("change", function () {
        currentGrouping = this.value; // Update the grouping variable
        updateChart(currentGrouping); // Re-render the chart
    });
});
