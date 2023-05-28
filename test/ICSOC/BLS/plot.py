import json
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

# Load the JSON data from the file
with open("test\ICSOC\BLS\data.json", "r") as file:
    data = json.load(file)

# Convert the JSON data to a DataFrame
df = pd.DataFrame(data)

# Remove rows with null values
df = df.dropna()

# Melt the DataFrame to have columns 'size', 'function', and 'price'
df_melted = df.melt(id_vars=['size'], var_name='function', value_name='price')

# Calculate the Saving Ratio for each function
size_0_prices = df.loc[df['size'] == 0].drop(columns=['size']).squeeze()


# Calculate the Saving Ratio for each function and convert to percentage
df_saving_ratio = df.copy()
for function in size_0_prices.index:
    df_saving_ratio[function] = (df_saving_ratio[function] / size_0_prices[function]) * 100

# Melt the Saving Ratio DataFrame
df_saving_ratio_melted = df_saving_ratio.melt(id_vars=['size'], var_name='function', value_name='saving_ratio_percentage')

# Create the plots using seaborn
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 6))

sns.lineplot(data=df_melted, x='size', y='price', hue='function', marker='o', ax=ax1)
ax1.set_title('Price of Different Functions vs Size')

sns.lineplot(data=df_saving_ratio_melted, x='size', y='saving_ratio_percentage', hue='function', marker='o', ax=ax2)
ax2.set_title('Saving Ratio Percentage of Different Functions vs Size')

plt.show()