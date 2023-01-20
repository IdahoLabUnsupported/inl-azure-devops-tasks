# Database Configuration

This is a documentation on how to use the DatabaseConfig type of task in the Execute PL/SQL task.

## Config Objects


| Tablespaces | Mandatory | Description | Data Type | Default Values | Allowable Values |
| ------ | ------ | ------ | ------ | ------ | ------ |
| name | yes | The name of the tablespace | String |  | Any
| blocksize | no | The number of KB in the block | Int |  8 | 2 4 8 16 32
| autoextend | no | Indicates if the tablespace will autoextend | String | ON | ON OFF
| initialsize | no | The intial size that the tablespace will be created as. i.e. 20G 250M  | String | 100G | Any 
| bigfile | no | Flag to indicate if the tablespace should be created as a bigfile | boolean | true | true false

Example
```sh
{
	"tableSpaces": [
		{
			"name": "SYSTEM",
			"blocksize": 8,
			"autoextend": "ON",
			"initialsize": "20G",
			"bigfile": "false"
		},
		{
			"name": "SYSAUX",
			"blocksize": 8,
			"autoextend": "ON",
			"initialsize": "20G",
			"bigfile": "false"
		}
    ]
}
```