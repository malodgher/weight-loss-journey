const init = async () => {
	//BMI Calculation: Convert weight to kilograms and divide by square of height in meters (convert 66in. to meters by multiplying by 0.0254)
	const weight_data = await d3.csv("./datasource/weight_exercise_foodlog.csv", d => {
		return { 
			date : d3.timeParse("%Y-%m-%d")(d.Date),
			weight : Number(d.Weight),
			bmi: ((Number(d.Weight) * 0.45359237)/(Math.pow((66*0.0254),2))),
			breakfast: String(d.Breakfast),
			nine_min: Boolean(d.Nine_Min),
			lunch: String(d.Lunch),
			dinner: String(d.Dinner),
			snacks: String(d.Snacks)
		}
	});

	const weight_svg = d3.select("#weightLine").append("svg").attr("viewBox", "0 0 "+(1200 + 2*(70))+" "+(300 + 2*(70))).attr("width", "95%");
	
	const date_format = d3.timeFormat("%m/%d/%Y")

	console.log(weight_data)

	lineSetup(weight_svg, weight_data, date_format)
}

const lineSetup = (line_svg, data, date_format) => {
	const bisectDate = d3.bisector(d => d.date).left //Look up D3 documenation API for info on d3.bisector
	const xs = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, 1200]);
	const ys = d3.scaleLinear().domain([120, (data[0].weight + 10)]).range([300, 0])

	const infoBox = d3.select("#infoBox")

	const infoBoxContainer = infoBox.append("div")
	infoBoxContainer.append("p").attr("id", "infoDate")
	infoBoxContainer.append("p").attr("id", "infoWeight")
	infoBoxContainer.append("p").attr("id", "infoBmi")
	const infoBreakfast = infoBoxContainer.append("div").attr("class", "meal-info")
	const infoLunch = infoBoxContainer.append("div").attr("class", "meal-info")
	const infoDinner = infoBoxContainer.append("div").attr("class", "meal-info")
	const infoSnacks = infoBoxContainer.append("div").attr("class", "meal-info")
	
	line_svg.append("g").attr("transform", "translate(70,70)")
		.append("path") //Line is added in canvas
			.datum(data)
			.attr("class", "line-set total-cases")
			.attr("d", d3.line()
				.x(d => xs(d.date))
				.y(d => ys(d.weight)));
	
	line_svg.append("g").attr("transform", "translate(70,70)")
		.append("path") //Line is added in canvas
			.datum(data)
			.attr("class", "line-set target-weight")
			.attr("d", d3.line()
				.x(d => xs(d.date))
				.y(d => ys(145)));
	
	const focus = line_svg.append("g").attr("transform", "translate(70,70)").style("opacity", 0)
	
	line_svg.append("g")
		.attr("transform", "translate(70,370)") //translate(margin,height + margin)
		.call(d3.axisBottom(xs) //Creates x axis on canvas
			.ticks(8)
			.tickFormat(date_format));
	
	line_svg.append("g").attr("transform", "translate(70,70)").call(d3.axisLeft(ys)); //Creates y axis on canvas
	
	focus.append("circle")
		.style("fill", "steelblue")
		.style("stroke", "steelblue")
		.attr("r", 4)
	
	//Toolip creation. Creates invisible rect object with same bounds as the svg canvas for the tooltip to traverse the line through
	line_svg.append("rect").attr("transform", "translate(70,70)")
		.attr("width", 1200)
		.attr("height", 300)
		.style("fill", "none")
		.style("pointer-events", "all")
		.on("mouseover", () => {
			focus.style("opacity", 1)
			infoBox.style("opacity", 1)
		})
		.on("mousemove", e => {
			//Uses x,y position of event pointer to get a date and get the index of that date using bisect
			//Then uses the conditional to determine if the position data is outputted or the data before it in the array is outputted
			let x0 = xs.invert((d3.pointer(e, this)[0]) - 78), // -78 is used since the x position is offset by about 78 pixels using d3.pointer
				i = bisectDate(data, x0, 1),
				d0 = data[i - 1],
				d1 = data[i],
				d = (x0 - d0.date > d1.date - x0) ? d1 : d0
			
			focus.select("circle")
				.attr("cx", xs(d.date))
				.attr("cy", ys(d.weight))
			
			infoBoxContainer.select("#infoDate").html(`Date: ${d.date.toLocaleDateString('en-US')}`)
			infoBoxContainer.select("#infoWeight").html(`Weight: ${d.weight.toLocaleString('en-US')} lbs.`)
			infoBoxContainer.select("#infoBmi").html(`BMI: ${d.bmi.toLocaleString('en-US')}`)

			infoBreakfast.selectAll("*").remove()
			ulInitialize(d.breakfast, infoBreakfast, "Breakfast")

			infoLunch.selectAll("*").remove()
			ulInitialize(d.lunch, infoLunch, "Lunch")

			infoDinner.selectAll("*").remove()
			ulInitialize(d.dinner, infoDinner, "Dinner")

			infoSnacks.selectAll("*").remove()
			ulInitialize(d.snacks, infoSnacks, "Snacks")
		})
		.on("mouseout", () => {
			focus.style("opacity", 0)
		})
}

const ulInitialize = (meal_data, meal_container, meal_string) => {
	if(meal_data === ""){
		meal_container.html(`${meal_string}: No record`)
	} else {
		const mealList = meal_data.split("_")
		if(meal_data.startsWith("~")) {
			const restaurant = meal_data.substring(1, meal_data.indexOf(">"))
			const mealUL = meal_container.html(`${meal_string} at ${restaurant}:`).append("ul")
			mealList[0] = mealList[0].substring((mealList[0].indexOf(">") + 1))
			mealList.forEach( listItem => noteInitialize(listItem, mealUL) )
		} else {
			const mealUL = meal_container.html(`${meal_string}:`).append("ul")
			mealList.forEach( listItem => noteInitialize(listItem, mealUL) )
		}
	}
}

const noteInitialize = (listItem, mealUL) => {
	if (listItem.includes("(") && listItem.includes(")")) {
		const noteSplit = listItem.split(" (")
		const ogLisItm = noteSplit[0]
		const noteList = noteSplit[1].substring(0, noteSplit[1].indexOf(")")).split(",")
		mealUL.append("li").html(ogLisItm)

		const noteUL = mealUL.append("ul")
		noteList.forEach(note => { noteUL.append("li").html(note.replaceAll(';', ',')) })

	} else {
		mealUL.append("li").html(listItem)
	}
}
