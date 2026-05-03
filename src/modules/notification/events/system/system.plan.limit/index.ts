import { register } from "../../registry";
import { definition } from "./definition";
import { handler } from "./handler";

register({ definition, handler });
