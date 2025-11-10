import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as dotenv from "dotenv";

//get environment variables from .env
dotenv.config();

export class MusicanatorBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //DynamoDB Table (to store playlists)
    const playlistTable = new dynamodb.Table(this, "PlaylistTable", {
      partitionKey: { name: "playlistId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,//On-demand billing
      removalPolicy: cdk.RemovalPolicy.DESTROY, //Auto-delete for dev purposes
    });

    //Lambda Function
    const musicanatorLambda = new lambda.Function(this, "MusicanatorFunction", {
    runtime: lambda.Runtime.NODEJS_18_X, //Node.js 18 runtime
    handler: "playlist.handler", //Entry point: playlist.js → exports.handler
    code: lambda.Code.fromAsset("lambda"), //Folder containing the Lambda code

    // 🕒 Increase timeout and memory to handle Gemini + Spotify API latency
    timeout: cdk.Duration.seconds(60), // Allows Gemini + Spotify to complete safely
    memorySize: 256, // More memory = faster networking performance

    environment: {
      //Secure environment variables
      GEMINI_KEY: process.env.GEMINI_KEY || "",
      SPOTIFY_TOKEN: process.env.SPOTIFY_TOKEN || "",
      SPOTIFY_REFRESH: process.env.SPOTIFY_REFRESH || "",
      SPOTIFY_USER: process.env.SPOTIFY_USER || "",
      PLAYLIST_TABLE: playlistTable.tableName,
    },
  });


    //Allow the Lambda to write to DynamoDB
    playlistTable.grantWriteData(musicanatorLambda);

    //API Gateway (public endpoint)
    const api = new apigateway.RestApi(this, "MusicanatorAPI", {
      restApiName: "Musicanator API",
      defaultCorsPreflightOptions: {
        //Enable CORS so frontend can call it
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    //Add a POST route: /playlist
    const playlistResource = api.root.addResource("playlist");
    playlistResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(musicanatorLambda)
    );

    //Output the endpoint URL after deployment
    new cdk.CfnOutput(this, "APIEndpoint", { value: api.url });

    const historyLambda = new lambda.Function(this, "HistoryFunction", {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: "history.handler",
  code: lambda.Code.fromAsset("lambda"),
  environment: {
    PLAYLIST_TABLE: playlistTable.tableName,
  },
});
api.root.addResource("history").addMethod("GET", new apigateway.LambdaIntegration(historyLambda));
  }
}








