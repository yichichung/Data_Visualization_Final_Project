import pandas as pd

# Load the data from CSV file
data_file ="112_Data_in_person.csv"
df = pd.read_csv(data_file)

# Extract the difficulty level and user name from NameClass
df['UserName'] = df['NameClass'].str.extract(r'(\D+)(?=Advanced|Intro|Multi)')
df['Difficulty'] = df['NameClass'].str.extract(r'(Advanced|Intro|Multi)')

# Save the modified DataFrame back to a new CSV file
df.to_csv("data_modified.csv", index=False)

print("Data has been processed and saved to data_modified.csv.")
