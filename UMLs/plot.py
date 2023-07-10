import json
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import scienceplots

plt.style.use(['science'])
plt.rcParams.update({'figure.dpi': '100'})

# Load the JSON data from the file
with open("test/ICSOC/Accountable/dataAccountable.json", "r") as file:
    data = json.load(file)

# Convert the JSON data to a DataFrame
df = pd.DataFrame(data)

# Remove rows with null values
df = df.dropna()

# Calculate the Saving Ratio for each function
size_0_prices = df.loc[df['size'] == 0].drop(columns=['size']).squeeze()

# Calculate the Saving Ratio for each function and convert to percentage
df_saving_ratio = df.copy()

for function in size_0_prices.index:
    df_saving_ratio[function] = (df_saving_ratio[function] / size_0_prices[function]) * 100

# Create the plots using matplotlib
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))

# Create a list of line styles
line_styles = ['-', '--', '-.', ':']
# Create a list of marker styles
marker_styles = ['o', 'v', '^', '<', '>', 's', 'p', '*', 'h', '+', 'x', 'D']

# Price of Different Functions vs Size (skipping baseline)
for i, function in enumerate(df.columns[1:]):
    ax1.plot(df.loc[df['size'] != 0, 'size'], df.loc[df['size'] != 0, function], label=function, 
            linestyle=line_styles[i % len(line_styles)], marker=marker_styles[i % len(marker_styles)], markevery=10)
ax1.set_title('Absolute gas costs vs Batch Size')
ax1.set_xlabel('Batch size')
ax1.set_ylabel('Gas cost')
ax1.legend()

# Saving Ratio Percentage of Different Functions vs Size
for i, function in enumerate(df_saving_ratio.columns[1:]):
    ax2.plot(df_saving_ratio.loc[df_saving_ratio['size'] != 0, 'size'], df_saving_ratio.loc[df_saving_ratio['size'] != 0, function], 
            label=function, linestyle=line_styles[i % len(line_styles)], marker=marker_styles[i % len(marker_styles)], markevery=10)

# Add a horizontal line representing the baseline at 100% in the relative gas cost chart
ax2.axhline(y=100, color='gray', linestyle='--', linewidth=1)

ax2.set_title('Percentage of the original function cost vs Batch Size')
ax2.set_xlabel('Batch size')
ax2.set_ylabel('Percentage cost')
ax2.legend()

plt.show()