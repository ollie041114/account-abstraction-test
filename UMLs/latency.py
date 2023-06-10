import json
import matplotlib.pyplot as plt
import scienceplots

plt.style.use(['science'])
plt.rcParams.update({'figure.dpi': '100'})


# Load the JSON data
with open("UMLs/batch_fill_times.json", "r") as f:
    data = json.load(f)

# Extract batch sizes and the corresponding times to fill
batch_sizes = [entry["batchSize"] for entry in data]
times_to_fill = [entry["timeToFill"] for entry in data]

# Create a plot for visualization
plt.figure(figsize=(10, 5))
plt.plot(batch_sizes, times_to_fill, marker="o", linestyle="--", markersize=5)
plt.title("Time to Fill Transaction Batches")
plt.xlabel("Batch Size")
plt.ylabel("Time to Fill (Days)")
plt.grid()
plt.savefig("batch_fill_times.png")  # Save the plot as a PNG image

# Show the plot
plt.show()