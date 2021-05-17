.PHONY: build
SHELL := /bin/bash
export PATH := $(CURDIR)/_tools/bin:$(PATH)
EPOCH=$(shell date +"%s")

GitHubRepoName=ihelp-server
GitHubBranch=$(shell git rev-parse --abbrev-ref HEAD)
GitHubToken=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
GitHubRepoOwner=ihelp-dev

ACCOUNTNAME=covid
AppName=$(GitHubRepoName)
REGION=us-west-2
Environment=production
aws=aws --profile $(ACCOUNTNAME) --region $(REGION)
REPO_URI=776006903638.dkr.ecr.$(REGION).amazonaws.com
NODE_IMAGE=$(REPO_URI)/node
IMAGE_URI=$(REPO_URI)/$(AppName)_$(Environment)

create_global_resources:
	$(aws) cloudformation create-stack \
		--stack-name global \
		--parameters \
			ParameterKey=Environment,ParameterValue="production" \
		--template-body file://configuration/cloudformation/global/global.yaml \
		--capabilities CAPABILITY_NAMED_IAM

create_vpc_resources:
	$(aws) cloudformation create-stack \
		--stack-name "$(StackName)-vpc" \
		--parameters \
			ParameterKey=Environment,ParameterValue=$(Environment) \
		--template-body file://configuration/cloudformation/infra/vpc.yaml \
		--capabilities CAPABILITY_NAMED_IAM

delete_global_resources:
	$(aws) cloudformation delete-stack \
		--stack-name global

delete_vpc_resources:
	$(aws) cloudformation delete-stack \
		--stack-name $(StackName)-vpc


create_pipeline_prod:
	$(aws) cloudformation create-stack \
		--stack-name "main" \
		--parameters \
			ParameterKey=Environment,ParameterValue=$(Environment) \
			ParameterKey=AppName,ParameterValue=$(AppName) \
			ParameterKey=GitHubRepoName,ParameterValue=$(GitHubRepoName) \
			ParameterKey=GitHubBranch,ParameterValue=$(GitHubBranch) \
			ParameterKey=GitHubRepoOwner,ParameterValue=$(GitHubRepoOwner) \
			ParameterKey=GitHubToken,ParameterValue=$(GitHubToken) \
		--template-body file://configuration/cloudformation/pipeline/pipeline-prod.yaml \
		--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND

delete_pipeline:
	$(aws) cloudformation delete-stack \
		--stack-name "main"

validate_templates:
	$(aws) cloudformation validate-template --template-body file://./configuration/cloudformation/pipeline/pipeline-prod.yaml 1>/dev/null
	$(aws) cloudformation validate-template --template-body file://./configuration/cloudformation/global/global.yaml 1>/dev/null
	$(aws) cloudformation validate-template --template-body file://./configuration/cloudformation/infra/ecs.yaml 1>/dev/null
	$(aws) cloudformation validate-template --template-body file://./configuration/cloudformation/infra/vpc.yaml 1>/dev/null
	
update_pipeline:
	validate_templates
	$(aws) cloudformation update-stack \
		--stack-name main \
		--template-body file://configuration/cloudformation/pipeline/pipeline-prod.yaml \
		--parameters \
			ParameterKey=Environment,ParameterValue=$(Environment) \
			ParameterKey=AppName,ParameterValue=$(AppName) \
			ParameterKey=GitHubRepoName,ParameterValue=$(GitHubRepoName) \
			ParameterKey=GitHubBranch,ParameterValue=$(GitHubBranch) \
			ParameterKey=GitHubRepoOwner,ParameterValue=$(GitHubRepoOwner) \
			ParameterKey=GitHubToken,ParameterValue=$(GitHubToken) \
		--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND

init_node_image:
	##Should be called after pipeline create ECR repository
	docker pull node
	$(aws ecr get-login --no-include-email --region $(REGION))
	docker tag node $(NODE_IMAGE):latest
	docker push "$(NODE_IMAGE):latest"


docker_local:
	docker build . -t ${AppName}:local --build-arg NODE_IMAGE=${NODE_IMAGE}
	docker run -p 8001:3001 ${AppName}:local 