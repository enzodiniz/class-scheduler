import yaml
yaml_file = open('teste.yaml')
res = yaml.safe_load(yaml_file)
for disciplina in res:
    print(disciplina)
#print(res)
