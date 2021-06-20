.PHONY: build lambda
SHELL := /bin/bash
export PATH := $(CURDIR)/_tools/bin:$(PATH)
EPOCH=$(shell date +"%s")

GitHubRepoName=ihelp-server
GitHubBranch=$(shell git rev-parse --abbrev-ref HEAD)
GitHubToken=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
GitHubRepoOwner=ihelp-dev

ACCOUNTNAME=covid
REGION=us-west-2
AppName=$(GitHubRepoName)
Environment=production
aws=aws --profile $(ACCOUNTNAME) --region $(REGION)
REPO_URI=776006903638.dkr.ecr.$(REGION).amazonaws.com
NODE_IMAGE=$(REPO_URI)/node
IMAGE_URI=$(REPO_URI)/$(AppName)-$(Environment)

create_global_resources: validate_templates
	$(aws) cloudformation create-stack \
		--stack-name global \
		--parameters \
			ParameterKey=Environment,ParameterValue="production" \
			ParameterKey=AppName,ParameterValue=$(AppName) \
		--template-body file://configuration/cloudformation/global/global.yaml \
		--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND

delete_global_resources:
	$(aws) cloudformation delete-stack \
		--stack-name global


create_pipeline_prod: validate_templates
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
	$(eval artificatsBucket=$(AppName)-$(Environment)-codepipeline-artifacts)
	$(aws) s3 rm s3://$(artificatsBucket) --recursive

	$(aws) cloudformation delete-stack \
		--stack-name "main"

validate_templates:
	$(aws) cloudformation validate-template --template-body file://./configuration/cloudformation/pipeline/pipeline-prod.yaml 1>/dev/null
	$(aws) cloudformation validate-template --template-body file://./configuration/cloudformation/global/global.yaml 1>/dev/null
	$(aws) cloudformation validate-template --template-body file://./configuration/cloudformation/infra/ecs.yaml 1>/dev/null
	$(aws) cloudformation validate-template --template-body file://./configuration/cloudformation/infra/vpc.yaml 1>/dev/null
	$(aws) cloudformation validate-template --template-body file://./lambda/cfn.yaml 1>/dev/null
	
update_pipeline: validate_templates
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

init_node_image: login_ecs
	docker pull node
	docker tag node $(NODE_IMAGE):latest
	docker push "$(NODE_IMAGE):latest"


docker_local:
	docker build . -t ${AppName}:local --build-arg NODE_IMAGE=${NODE_IMAGE} 
	docker run  -e "NODE_PORT=8080" \
		-e "NODE_ENV=development" \
		-p 8085:8080 ${AppName}:local

login_ecs:
	$(aws) ecr get-login-password  | docker login --username AWS --password-stdin $(REPO_URI)
	$(aws ecr get-login --no-include-email $(REGION))

setup_prod_infra: validate_templates create_global_resources create_pipeline_prod init_node_image
	echo "Infra created"


lambda:
	mkdir -p output
	aws cloudformation package \
		--template-file ./lambda/cfn.yaml \
		--s3-bucket ${AppName}-${Environment}-lambda-zip \
		--s3-prefix ${Environment} \
		--output-template-file output/lambda-out.yaml

delete_infra: delete_pipeline delete_global_resources 