import json
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import scienceplots

plt.style.use(['science'])
plt.rcParams.update({'figure.dpi': '100'})
plt.rcParams.update({"legend.frameon": True})


# Load JSON data for normal smart contract invocation
with open("test/ICSOC/Accountable/latency-data/latency-data.json", "r") as f:
    normal_invocation = json.load(f)

# Calculate overall average latency for normal invocation
all_latencies = []
for function in normal_invocation:
    for instance in normal_invocation[function]:
        all_latencies.append(instance["average_latency"])
average_normal_latencies = np.mean(all_latencies)

# Convert to seconds
average_normal_latencies /= 1000

# Load JSON data for normal batching
with open("UMLs/batch_fill_times.json", "r") as f:
    normal_batching = json.load(f)

# Convert batch latencies to seconds and save as a list for each throughput scenario
def convert_batch_latencies(batch_data):
    return [
        {"batchSize": b["batchSize"], "timeToFill": b["timeToFill"] * 60}
        for b in batch_data
    ]

high_batch_latencies = convert_batch_latencies(normal_batching["high"]["data"])
medium_batch_latencies = convert_batch_latencies(normal_batching["medium"]["data"])
low_batch_latencies = convert_batch_latencies(normal_batching["low"]["data"])

# Our batching latency
our_batching_latency = 1

# Plotting the data
fig, ax = plt.subplots()

# Plot normal invocation
ax.axhline(
    average_normal_latencies,
    color="blue",
    linestyle="--",
    label="Normal Invocation (Avg)",
)

# Plot normal batching for high, medium, and low scenarios with different marker styles
batch_sizes = [entry["batchSize"] for entry in high_batch_latencies]

high_batch_times = [entry["timeToFill"] for entry in high_batch_latencies]
ax.plot(batch_sizes, high_batch_times, 'g-', marker='o', markersize=3, label="High Throughput Batching", linestyle="-")

medium_batch_times = [entry["timeToFill"] for entry in medium_batch_latencies]
ax.plot(batch_sizes, medium_batch_times, 'g-', marker='^', markersize=3, label="Medium Throughput Batching", linestyle="--")

low_batch_times = [entry["timeToFill"] for entry in low_batch_latencies]
ax.plot(batch_sizes, low_batch_times, 'g-', marker='s', markersize=3, label="Low Throughput Batching", linestyle="-.")

# Plot our batching
ax.axhline(our_batching_latency, color="red", linestyle="--", label="Our solution (Avg)")

# Logarithmic scale on the left (in seconds)
ax.set_yscale("log")
ax.tick_params(axis='y', labelcolor="blue")
ax.set_ylabel("Latency (seconds)", color="blue")
ax.yaxis.label.set_color("blue")

# Customize y-axis tick labels for actual days and seconds
def log_tick_formatter(val, pos=None):
    return "{:.1f}".format(val)

ax.yaxis.set_major_formatter(ticker.FuncFormatter(log_tick_formatter))

# Secondary y-axis with scale in days
def to_days(x):
    return x / 86400

def to_seconds(x):
    return x * 86400

secax = ax.secondary_yaxis(
    "right",
    functions=(to_days, to_seconds)
)

secax.tick_params(axis='y', labelcolor="green")
secax.set_ylabel("Latency (days)", color="green")
secax.yaxis.label.set_color("green")

# Customize secondary y-axis tick labels for actual days
def custom_formatter(val, pos=None):
    # Obtain tick value in seconds
    val_seconds = to_seconds(val)

    # decimals = 0

    formatted_tick = round(val_seconds / 86400, 0)

    return formatted_tick

secax.yaxis.set_major_formatter(ticker.FuncFormatter(custom_formatter))

# Labels and title
ax.set_xlabel("Batch Size")
ax.set_title("Latency Comparison")

# plt.xticks(np.arange(0, len(batchsizes), step=max(len(batch_sizes)//10, 1)))
plt.legend(facecolor="white", edgecolor="black", framealpha=1, fancybox=True)

# ax.spines["right"].set_color("blue")
# ax2.spines["right"].set_color("green")

plt.show()