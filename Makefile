.PHONY: build
SHELL := /bin/bash
export PATH := $(CURDIR)/_tools/bin:$(PATH)
EPOCH=$(shell date +"%s")

GitHubRepoName="ihelp-server"
GitHubBranch=$(shell git rev-parse --abbrev-ref HEAD)
GitHubToken=" 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"
GitHubRepoOwner="ihelp-dev"

ACCOUNTNAME="covid"
APP_NAME="${GitHubRepo}"
REGION="us-west-2"
aws=aws --profile $(ACCOUNTNAME) --region $(REGION)
StackName="ihelp-production"
Environment="production"

create_dev_pipeline:
		aws --profile $(ACCOUNTNAME) cloudformation \
		create-stack --stack-name ihelp-${USER} \
		--template-body file://configuration/cloudformation/infra/vpc.yaml \
		--parameters \
		ParameterKey=GitHubUser,ParameterValue="ihelp-dev" \
		ParameterKey=GitHubRepo,ParameterValue=${USER} \
		ParameterKey=GitHubBranch,ParameterValue=${GitHubBranch} \
		ParameterKey=BranchName,ParameterValue=${GitHubBranch}

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
		--stack-name "$(StackName)-pipeline" \
		--parameters \
			ParameterKey=Environment,ParameterValue=$(Environment) \
			ParameterKey=AppName,ParameterValue=$(AppName) \
			ParameterKey=GitHubRepoName,ParameterValue=$(GitHubRepoName) \
			ParameterKey=GitHubBranch,ParameterValue=$(GitHubBranch) \
			ParameterKey=GitHubRepoOwner,ParameterValue=$(GitHubRepoOwner) \
			ParameterKey=GitHubToken,ParameterValue=$(GitHubToken) \
		--template-body file://configuration/cloudformation/pipeline/pipeline-prod.yaml \
		--capabilities CAPABILITY_NAMED_IAM

delete_pipeline:
	$(aws) cloudformation delete-stack \
		--stack-name "$(StackName)-pipeline" \

